const { getDb } = require('../../database/db');
const logger = require('../logs/logger');

async function checkSteamChangelogs() {
  try {
    const db = getDb();
    const trackedGames = db.prepare('SELECT game_id, steam_app_id, name FROM games WHERE steam_app_id IS NOT NULL').all();

    for (const game of trackedGames) {
      logger.info('Steam changelog check placeholder', { game: game.name, appId: game.steam_app_id });
    }
  } catch (error) {
    logger.error('Failed Steam changelog cycle', error);
  }
}

function startChangelogTimer(intervalMs = 60 * 60 * 1000) {
  return setInterval(checkSteamChangelogs, intervalMs);
}

module.exports = {
  checkSteamChangelogs,
  startChangelogTimer
};
