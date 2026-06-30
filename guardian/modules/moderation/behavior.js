const { getDb } = require('../../database/db');

function incrementBehaviorScore(guildId, userId, delta = 1) {
  const db = getDb();
  db.prepare(
    `UPDATE members
     SET score_comportement = score_comportement + ?
     WHERE guild_id = ? AND user_id = ?`
  ).run(delta, guildId, userId);

  const row = db
    .prepare('SELECT score_comportement FROM members WHERE guild_id = ? AND user_id = ?')
    .get(guildId, userId);

  return row?.score_comportement ?? 0;
}

module.exports = {
  incrementBehaviorScore
};
