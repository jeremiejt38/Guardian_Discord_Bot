const { getGuildSetting } = require('../config/settings');
const logger = require('../logs/logger');

async function sendModLog(guild, content) {
  if (!guild) return;
  const guildId = guild.id;

  const enabled = Boolean(getGuildSetting(guildId, 'modules', 'mod_logs_enabled', false));
  if (!enabled) return;

  const channelId = getGuildSetting(guildId, 'channels', 'moderation_logs_channel_id', null);
  if (!channelId) return;

  const channel = guild.channels?.cache?.get(channelId);
  if (!channel) {
    logger.warn('sendModLog: channel introuvable', { guildId, channelId });
    return;
  }

  await channel.send({ content }).catch((err) => {
    logger.warn('sendModLog: échec envoi', { guildId, channelId, error: err?.message });
  });
}

module.exports = { sendModLog };
