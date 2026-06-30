const { getDb } = require('../../database/db');
const { incrementBehaviorScore } = require('./behavior');

function saveSanction({ guildId, userId, type, reason, appliedBy, duration = null, auto = 0 }) {
  const db = getDb();
  db.prepare(
    `INSERT INTO sanctions (guild_id, user_id, type, reason, applied_by, timestamp, duration, auto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(guildId, userId, type, reason, appliedBy, new Date().toISOString(), duration, auto);

  incrementBehaviorScore(guildId, userId, 1);
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
  getSanctionsHistory
};
