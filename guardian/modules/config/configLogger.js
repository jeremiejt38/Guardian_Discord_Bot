const { CHANNELS } = require('../../config');
const { findTextChannelByName } = require('../utils/channels');

async function logConfigChange(guild, userId, parameter, oldValue, newValue) {
  const channel = findTextChannelByName(guild, CHANNELS.configLogs);
  if (!channel) return;

  const line = `\`${new Date().toISOString()}\` — <@${userId}> a modifié **${parameter}** : \`${JSON.stringify(oldValue)}\` → \`${JSON.stringify(newValue)}\``;
  await channel.send(line).catch(() => undefined);
}

module.exports = { logConfigChange };
