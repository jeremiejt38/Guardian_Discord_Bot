const crypto = require('crypto');
const { setGuildSetting, getGuildSetting } = require('../config/settings');
const logger = require('../logs/logger');

const CONFIRM_TTL_MS = 15 * 60 * 1000;

/**
 * Generates a one-time confirmation token for a specific action on a guild.
 * Stores it in guild settings with a TTL.
 * @param {string} guildId
 * @param {string} action  — unique action key (e.g. 'owner_transfer')
 * @param {object} [meta]  — extra data to store with the token (e.g. { targetId })
 * @returns {string} token
 */
function generateConfirmToken(guildId, action, meta = {}) {
  const token = crypto.randomBytes(24).toString('hex');
  const payload = JSON.stringify({ token, action, meta, expiresAt: Date.now() + CONFIRM_TTL_MS });
  setGuildSetting(guildId, 'confirmations', action, payload);
  logger.debug(`Confirmation token generated for guild ${guildId} action '${action}'`);
  return token;
}

/**
 * Validates a one-time confirmation token.
 * Consumes the token on success (can only be used once).
 * @param {string} guildId
 * @param {string} action
 * @param {string} token
 * @returns {{ ok: boolean, meta?: object, reason?: string }}
 */
function validateConfirmToken(guildId, action, token) {
  const raw = getGuildSetting(guildId, 'confirmations', action, null);
  if (!raw) return { ok: false, reason: 'not_found' };
  let payload;
  try { payload = JSON.parse(raw); } catch { return { ok: false, reason: 'invalid' }; }
  if (payload.token !== token) return { ok: false, reason: 'mismatch' };
  if (Date.now() > payload.expiresAt) {
    setGuildSetting(guildId, 'confirmations', action, null);
    return { ok: false, reason: 'expired' };
  }
  setGuildSetting(guildId, 'confirmations', action, null);
  return { ok: true, meta: payload.meta };
}

/**
 * Sends a confirmation DM to a user with a deep link back to the guild channel.
 * Returns the token so the caller can validate it later.
 * @param {object} opts
 * @param {import('discord.js').User} opts.user
 * @param {string} opts.guildId
 * @param {string} opts.guildName
 * @param {string} opts.channelId  — channel the confirm button lives in
 * @param {string} opts.action     — machine key (e.g. 'owner_transfer')
 * @param {string} opts.title      — DM title
 * @param {string} opts.body       — DM body text
 * @param {object} [opts.meta]     — extra data stored with the token
 * @returns {Promise<string|null>} token, or null if DM failed
 */
async function sendConfirmationDM({ user, guildId, guildName, channelId, action, title, body, meta = {} }) {
  const token = generateConfirmToken(guildId, action, meta);
  const link = `https://discord.com/channels/${guildId}/${channelId}`;
  try {
    await user.send({
      content: [
        `## ${title}`,
        '',
        body,
        '',
        `➡️ **Confirm here:** ${link}`,
        `> Your confirmation link is valid for 15 minutes.`,
        `> Token: \`${token}\``
      ].join('\n')
    });
    logger.info(`Confirmation DM sent to ${user.id} for guild ${guildId} action '${action}'`);
    return token;
  } catch (err) {
    logger.warn(`Could not send confirmation DM to ${user.id}: ${err?.message}`);
    return null;
  }
}

module.exports = { generateConfirmToken, validateConfirmToken, sendConfirmationDM };
