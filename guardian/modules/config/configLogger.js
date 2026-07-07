const { CHANNELS } = require('../../config');
const { findTextChannelByName } = require('../utils/channels');

const EMOJI = {
  config:    '⚙️',
  member:    '👤',
  sanction:  '🔨',
  game:      '🎮',
  setup:     '🔧',
  backup:    '💾',
  security:  '🔒',
  server:    '🖥️',
  info:      'ℹ️'
};

async function logToChannel(guild, category, message) {
  const channel = findTextChannelByName(guild, CHANNELS.configLogs);
  if (!channel) return;
  const emoji = EMOJI[category] ?? EMOJI.info;
  const ts = `<t:${Math.floor(Date.now() / 1000)}:T>`;
  const line = `${emoji} ${ts} ${message}`;
  await channel.send(line).catch(() => undefined);
}

async function logConfigChange(guild, userId, parameter, oldValue, newValue) {
  const msg = `<@${userId}> a modifié **${parameter}** : \`${JSON.stringify(oldValue)}\` → \`${JSON.stringify(newValue)}\``;
  await logToChannel(guild, 'config', msg);
}

module.exports = { logConfigChange, logToChannel, EMOJI };
