const { getDb } = require('../../database/db');
const { CHANNELS } = require('../../config');
const { t } = require('../i18n');

function setGuildSetting(guildId, moduleName, key, value) {
  const db = getDb();
  db.prepare(
    `INSERT INTO guild_config (guild_id, module, key, value)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id, module, key)
     DO UPDATE SET value = excluded.value`
  ).run(guildId, moduleName, key, JSON.stringify(value));
}

function getGuildSetting(guildId, moduleName, key, fallback = null) {
  const db = getDb();
  const row = db
    .prepare('SELECT value FROM guild_config WHERE guild_id = ? AND module = ? AND key = ?')
    .get(guildId, moduleName, key);

  if (!row) {
    return fallback;
  }

  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

async function ensureChannelMessage(channel, content) {
  if (!channel?.isTextBased?.()) {
    return;
  }

  if (!channel.lastMessageId) {
    await channel.send(content);
  }
}

async function ensureMemberGameInterfaces(guild) {
  const gameChannelsChannel = guild.channels.cache.find((channel) => channel.name === CHANNELS.gameChannels);
  const gameListChannel = guild.channels.cache.find((channel) => channel.name === CHANNELS.gameList);

  await ensureChannelMessage(
    gameChannelsChannel,
    t(guild.id, 'settings.gameChannelsHint')
  );
  await ensureChannelMessage(
    gameListChannel,
    t(guild.id, 'settings.gameListHint')
  );
}

function getBehaviorInterfaceData(guildId, fallbackThresholds = []) {
  return {
    thresholds: getGuildSetting(guildId, 'behavior', 'thresholds', fallbackThresholds),
    pageSize: getGuildSetting(guildId, 'behavior', 'page_size', 10)
  };
}

module.exports = {
  setGuildSetting,
  getGuildSetting,
  ensureMemberGameInterfaces,
  getBehaviorInterfaceData
};
