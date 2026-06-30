const crypto = require('crypto');
const { getDb } = require('../../database/db');

function buildGuildHash(guildId) {
  return crypto.createHash('sha256').update(String(guildId)).digest('hex');
}

function isGuildInstalled(guildId) {
  const db = getDb();
  const setupHash = buildGuildHash(guildId);

  const row = db
    .prepare('SELECT setup_done FROM guilds WHERE guild_id = ? AND setup_hash = ?')
    .get(guildId, setupHash);

  return Boolean(row?.setup_done);
}

function markGuildInstalled(guildId, ownerId) {
  const db = getDb();
  const setupHash = buildGuildHash(guildId);

  db.prepare(
    `INSERT INTO guilds (guild_id, setup_done, setup_hash, owner_id)
     VALUES (?, 1, ?, ?)
     ON CONFLICT(guild_id)
     DO UPDATE SET setup_done = 1, setup_hash = excluded.setup_hash, owner_id = excluded.owner_id`
  ).run(guildId, setupHash, ownerId || null);
}

module.exports = {
  buildGuildHash,
  isGuildInstalled,
  markGuildInstalled
};
