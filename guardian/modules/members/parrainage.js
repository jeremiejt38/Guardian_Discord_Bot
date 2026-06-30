const { getDb } = require('../../database/db');

function saveSponsorship(guildId, parrainId, inviteId) {
  const db = getDb();
  db.prepare(
    `INSERT INTO parrainage (guild_id, parrain_id, invite_id, date)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id, invite_id)
     DO UPDATE SET parrain_id = excluded.parrain_id, date = excluded.date`
  ).run(guildId, parrainId, inviteId, new Date().toISOString());
}

function getSponsorship(guildId, inviteId) {
  const db = getDb();
  return db.prepare('SELECT * FROM parrainage WHERE guild_id = ? AND invite_id = ?').get(guildId, inviteId);
}

module.exports = {
  saveSponsorship,
  getSponsorship
};
