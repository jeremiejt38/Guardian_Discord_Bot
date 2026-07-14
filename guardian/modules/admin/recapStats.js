const { getDb } = require('../../database/db');

const DAYS = 30;

function getDateThreshold() {
  const d = new Date();
  d.setDate(d.getDate() - DAYS);
  return d.toISOString();
}

function getNewMemberCount() {
  try {
    const db = getDb();
    const threshold = getDateThreshold();
    const row = db.prepare('SELECT COUNT(*) AS count FROM members WHERE created_at >= ?').get(threshold);
    return row?.count ?? 0;
  } catch (err) {
    return 0;
  }
}

function getActiveGameCount() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(DISTINCT game_id) AS count FROM member_games').get();
    return row?.count ?? 0;
  } catch (err) {
    return 0;
  }
}

function getModerationIncidentCount() {
  try {
    const db = getDb();
    const threshold = getDateThreshold();
    const row = db.prepare(
      "SELECT COUNT(*) AS count FROM sanctions WHERE created_at >= ? AND type IN ('warn', 'kick', 'ban', 'mute')"
    ).get(threshold);
    return row?.count ?? 0;
  } catch (err) {
    return 0;
  }
}

function getRecapStats() {
  return {
    newMemberCount: getNewMemberCount(),
    activeGameCount: getActiveGameCount(),
    moderationIncidentCount: getModerationIncidentCount(),
    days: DAYS,
  };
}

module.exports = {
  getRecapStats,
  getNewMemberCount,
  getActiveGameCount,
  getModerationIncidentCount,
};
