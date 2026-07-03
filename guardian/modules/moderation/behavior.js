const { getDb } = require('../../database/db');
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const logger = require('../logs/logger');

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

function getBehaviorThresholds(guildId) {
  return getGuildSetting(guildId, 'behavior', 'thresholds', []);
}

function setBehaviorThresholds(guildId, thresholds) {
  const normalized = (thresholds || [])
    .map((item) => ({ score: Number(item.score) || 0, sanction: String(item.sanction || 'warn') }))
    .filter((item) => item.score > 0)
    .sort((a, b) => a.score - b.score);
  setGuildSetting(guildId, 'behavior', 'thresholds', normalized);
  return normalized;
}

function upsertBehaviorThreshold(guildId, score, sanction) {
  const thresholds = getBehaviorThresholds(guildId);
  const safeScore = Number(score) || 0;
  const next = thresholds.filter((item) => item.score !== safeScore);
  next.push({ score: safeScore, sanction: String(sanction || 'warn') });
  return setBehaviorThresholds(guildId, next);
}

function removeBehaviorThreshold(guildId, score) {
  const safeScore = Number(score) || 0;
  const thresholds = getBehaviorThresholds(guildId).filter((item) => item.score !== safeScore);
  return setBehaviorThresholds(guildId, thresholds);
}

function listBehaviorScores(guildId, page = 0, pageSize = 10) {
  const db = getDb();
  const offset = Math.max(page, 0) * pageSize;
  const rows = db
    .prepare(
      `SELECT user_id, score_comportement
       FROM members
       WHERE guild_id = ?
       ORDER BY score_comportement DESC, user_id ASC
       LIMIT ? OFFSET ?`
    )
    .all(guildId, pageSize, offset);

  const total = db
    .prepare('SELECT COUNT(*) as count FROM members WHERE guild_id = ?')
    .get(guildId)?.count || 0;

  return {
    rows,
    page,
    pageSize,
    total
  };
}

function resetBehaviorScore(guild, userId, actorId) {
  const db = getDb();
  db.prepare(
    `UPDATE members
     SET score_comportement = 0
     WHERE guild_id = ? AND user_id = ?`
  ).run(guild.id, userId);

  logger.logToDiscord(
    guild,
    `Reset score comportement: <@${userId}> par <@${actorId}>`
  );
}

module.exports = {
  incrementBehaviorScore,
  getBehaviorThresholds,
  setBehaviorThresholds,
  upsertBehaviorThreshold,
  removeBehaviorThreshold,
  listBehaviorScores,
  resetBehaviorScore
};
