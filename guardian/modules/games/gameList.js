const { getDb } = require('../../database/db');

function getGuildGames(guildId) {
  const db = getDb();
  return db.prepare('SELECT game_id, name, role_id FROM games WHERE guild_id = ? ORDER BY name').all(guildId);
}

function getMemberGames(guildId, userId) {
  const db = getDb();
  return db.prepare('SELECT game_id FROM member_games WHERE guild_id = ? AND user_id = ?').all(guildId, userId);
}

function setMemberGames(guildId, userId, gameIds) {
  const db = getDb();
  const tx = db.transaction((ids) => {
    db.prepare('DELETE FROM member_games WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
    const insert = db.prepare('INSERT INTO member_games (guild_id, user_id, game_id) VALUES (?, ?, ?)');
    for (const gameId of ids) {
      insert.run(guildId, userId, gameId);
    }
  });

  tx(gameIds);
}

module.exports = {
  getGuildGames,
  getMemberGames,
  setMemberGames
};
