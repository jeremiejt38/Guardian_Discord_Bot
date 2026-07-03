const { getDb } = require('../../database/db');
const { getGuildSetting } = require('../config/settings');

function ensureMemberRow(guildId, userId) {
  const db = getDb();
  db.prepare(
    `INSERT INTO members (guild_id, user_id, grade, join_date, score_comportement)
     VALUES (?, ?, 'invite', ?, ?)
     ON CONFLICT(guild_id, user_id) DO NOTHING`
  ).run(guildId, userId, new Date().toISOString(), 200);
}

function getBehaviorConfig(guildId) {
  return {
    enabled: Boolean(getGuildSetting(guildId, 'moderation', 'behavior_score_enabled', false)),
    scoreMax: Math.max(50, Number(getGuildSetting(guildId, 'behavior', 'score_max', 350))),
    scoreDefault: Math.max(0, Number(getGuildSetting(guildId, 'behavior', 'score_default', 200))),
    scoreFloor: Math.max(0, Number(getGuildSetting(guildId, 'behavior', 'score_floor', 0))),
    alertThreshold: Math.max(0, Number(getGuildSetting(guildId, 'behavior', 'alert_threshold', 150))),
    restrictionThreshold: Math.max(0, Number(getGuildSetting(guildId, 'behavior', 'restriction_threshold', 100))),
    sanctionThreshold: Math.max(0, Number(getGuildSetting(guildId, 'behavior', 'sanction_threshold', 50))),
    banThreshold: Math.max(0, Number(getGuildSetting(guildId, 'behavior', 'ban_threshold', 20))),
    muteDurationMinutes: Math.max(1, Number(getGuildSetting(guildId, 'behavior', 'auto_mute_minutes', 60))),
    penalties: {
      warn: Math.max(1, Number(getGuildSetting(guildId, 'behavior', 'penalty_warn', 10))),
      mute: Math.max(1, Number(getGuildSetting(guildId, 'behavior', 'penalty_mute', 20))),
      kick: Math.max(1, Number(getGuildSetting(guildId, 'behavior', 'penalty_kick', 80))),
      ban: Math.max(1, Number(getGuildSetting(guildId, 'behavior', 'penalty_ban', 120))),
      auto_spam: Math.max(1, Number(getGuildSetting(guildId, 'behavior', 'penalty_auto_spam', 8)))
    }
  };
}

function getCurrentBehaviorScore(guildId, userId) {
  const db = getDb();
  const config = getBehaviorConfig(guildId);
  ensureMemberRow(guildId, userId);

  const row = db.prepare('SELECT score_comportement FROM members WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  let current = Number(row?.score_comportement);
  if (!Number.isFinite(current) || current <= 0) {
    current = config.scoreDefault;
    db.prepare('UPDATE members SET score_comportement = ? WHERE guild_id = ? AND user_id = ?').run(current, guildId, userId);
  }

  return current;
}

function applyBehaviorPenalty(guildId, userId, penaltyPoints) {
  const db = getDb();
  const config = getBehaviorConfig(guildId);
  ensureMemberRow(guildId, userId);

  const previous = getCurrentBehaviorScore(guildId, userId);
  const next = Math.max(config.scoreFloor, previous - Math.max(0, Number(penaltyPoints || 0)));

  db.prepare(
    `UPDATE members
     SET score_comportement = ?
     WHERE guild_id = ? AND user_id = ?`
  ).run(next, guildId, userId);

  return { previous, next };
}

function getPenaltyForSanctionType(guildId, sanctionType) {
  const config = getBehaviorConfig(guildId);
  const key = String(sanctionType || '').toLowerCase();
  return config.penalties[key] || config.penalties.warn;
}

function computeBehaviorOutcome(guildId, score) {
  const config = getBehaviorConfig(guildId);

  if (score < config.banThreshold) {
    return { level: 'ban' };
  }
  if (score < config.sanctionThreshold) {
    return { level: 'kick' };
  }
  if (score < config.restrictionThreshold) {
    return { level: 'mute', durationMs: config.muteDurationMinutes * 60 * 1000 };
  }
  if (score < config.alertThreshold) {
    return { level: 'alert' };
  }

  return { level: 'none' };
}

module.exports = {
  getBehaviorConfig,
  getCurrentBehaviorScore,
  applyBehaviorPenalty,
  getPenaltyForSanctionType,
  computeBehaviorOutcome
};
