const { getDb } = require('../../database/db');

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

module.exports = {
  setGuildSetting,
  getGuildSetting
};
