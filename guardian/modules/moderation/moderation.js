const { getDb } = require('../../database/db');
const {
  getBehaviorConfig,
  applyBehaviorPenalty,
  getPenaltyForSanctionType,
  computeBehaviorOutcome
} = require('./behavior');
const logger = require('../logs/logger');

function parseDurationToMs(durationText) {
  const raw = String(durationText || '').trim().toLowerCase();
  const match = raw.match(/^(\d+)\s*([smhd])$/);
  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }

  const factors = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return amount * factors[unit];
}

async function runAutomaticBehaviorAction({ guild, member, guildId, userId, appliedBy, currentScore }) {
  if (!guild) {
    return;
  }

  const outcome = computeBehaviorOutcome(guildId, currentScore);
  if (outcome.level === 'none' || outcome.level === 'alert') {
    return;
  }

  const target = member || (await guild.members.fetch(userId).catch(() => null));
  if (!target) {
    return;
  }

  if (outcome.level === 'mute') {
    await target.timeout(outcome.durationMs, 'Guardian: comportement sous seuil').catch(() => undefined);
    await saveSanction({
      guildId,
      userId,
      type: 'mute',
      reason: 'Auto-sanction: score comportemental sous seuil restriction',
      appliedBy,
      duration: `${Math.max(1, Math.floor(outcome.durationMs / 60000))}m`,
      auto: 1,
      skipBehaviorImpact: true
    });
    return;
  }

  if (outcome.level === 'kick') {
    await target.kick('Guardian: comportement sous seuil sanction').catch(() => undefined);
    await saveSanction({
      guildId,
      userId,
      type: 'kick',
      reason: 'Auto-sanction: score comportemental sous seuil sanction',
      appliedBy,
      auto: 1,
      skipBehaviorImpact: true
    });
    return;
  }

  if (outcome.level === 'ban') {
    await guild.members.ban(userId, { reason: 'Guardian: comportement sous seuil ban' }).catch(() => undefined);
    await saveSanction({
      guildId,
      userId,
      type: 'ban',
      reason: 'Auto-sanction: score comportemental sous seuil ban',
      appliedBy,
      auto: 1,
      skipBehaviorImpact: true
    });
  }
}

async function saveSanction({
  guildId,
  userId,
  type,
  reason,
  appliedBy,
  duration = null,
  auto = 0,
  guild = null,
  member = null,
  skipBehaviorImpact = false
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO sanctions (guild_id, user_id, type, reason, applied_by, timestamp, duration, auto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(guildId, userId, type, reason, appliedBy, new Date().toISOString(), duration, auto);

  const config = getBehaviorConfig(guildId);
  if (!config.enabled || skipBehaviorImpact) {
    return;
  }

  try {
    const penalty = getPenaltyForSanctionType(guildId, auto && type === 'warn' ? 'auto_spam' : type);
    const { next } = applyBehaviorPenalty(guildId, userId, penalty);
    await runAutomaticBehaviorAction({ guild, member, guildId, userId, appliedBy, currentScore: next });
  } catch (error) {
    logger.error('Failed behavior penalty/sanction pipeline', error);
  }
}

function getSanctionsHistory(guildId, userId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT type, reason, applied_by, timestamp, duration, auto
       FROM sanctions
       WHERE guild_id = ? AND user_id = ?
       ORDER BY sanction_id DESC`
    )
    .all(guildId, userId);
}

module.exports = {
  saveSanction,
  getSanctionsHistory,
  parseDurationToMs
};
