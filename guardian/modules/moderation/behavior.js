const { getDb } = require('../../database/db');
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const logger = require('../logs/logger');

const SCORE_MAX = 350;
const SCORE_DEFAULT = 200;
const SCORE_FLOOR = 0;

function clampScore(score) {
  return Math.min(SCORE_MAX, Math.max(SCORE_FLOOR, score));
}

function incrementBehaviorScore(guildId, userId, delta = 1) {
  const db = getDb();
  const current = db
    .prepare('SELECT score_comportement FROM members WHERE guild_id = ? AND user_id = ?')
    .get(guildId, userId)?.score_comportement ?? SCORE_DEFAULT;

  const next = clampScore(current + delta);
  db.prepare(
    'UPDATE members SET score_comportement = ? WHERE guild_id = ? AND user_id = ?'
  ).run(next, guildId, userId);

  return next;
}

function applyNitroBoost(guildId, userId) {
  const db = getDb();
  const row = db
    .prepare('SELECT score_comportement FROM members WHERE guild_id = ? AND user_id = ?')
    .get(guildId, userId);
  if (!row) return 0;
  const next = clampScore(row.score_comportement + 50);
  db.prepare('UPDATE members SET score_comportement = ? WHERE guild_id = ? AND user_id = ?').run(next, guildId, userId);
  logger.info(`Nitro boost score +50 → ${next} for ${userId} in ${guildId}`);
  return next;
}

async function runPassiveScoreRegen(client) {
  const db = getDb();
  const guilds = db.prepare('SELECT guild_id FROM guilds WHERE setup_done = 1').all();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const { guild_id: guildId } of guilds) {
    const regenEnabled = getGuildSetting(guildId, 'behavior', 'passive_regen_enabled', true);
    if (!regenEnabled) continue;

    const regenAmount = Number(getGuildSetting(guildId, 'behavior', 'passive_regen_amount', 5));
    const floor = Number(getGuildSetting(guildId, 'behavior', 'passive_regen_floor', 150));

    const members = db.prepare(
      `SELECT user_id, score_comportement, last_regen_at
       FROM members WHERE guild_id = ?`
    ).all(guildId);

    for (const member of members) {
      const lastRegen = member.last_regen_at ? new Date(member.last_regen_at).getTime() : 0;
      if (now - lastRegen < threeDaysMs) continue;
      if (member.score_comportement >= floor) {
        db.prepare('UPDATE members SET last_regen_at = ? WHERE guild_id = ? AND user_id = ?')
          .run(new Date().toISOString(), guildId, member.user_id);
        continue;
      }
      const next = Math.min(floor, clampScore(member.score_comportement + regenAmount));
      db.prepare(
        'UPDATE members SET score_comportement = ?, last_regen_at = ? WHERE guild_id = ? AND user_id = ?'
      ).run(next, new Date().toISOString(), guildId, member.user_id);
    }
  }
}

async function checkBehaviorThresholds(guild, userId) {
  const db = getDb();
  const row = db
    .prepare('SELECT score_comportement FROM members WHERE guild_id = ? AND user_id = ?')
    .get(guild.id, userId);
  if (!row) return;

  const thresholds = getBehaviorThresholds(guild.id)
    .sort((a, b) => b.score - a.score);

  for (const threshold of thresholds) {
    if (row.score_comportement <= threshold.score) {
      try {
        const target = await guild.members.fetch(userId).catch(() => null);
        if (!target) return;

        if (threshold.sanction === 'warn') {
          logger.logToDiscord(guild, `Auto-sanction: warn pour <@${userId}> (score ${row.score_comportement} ≤ ${threshold.score})`);
        } else if (threshold.sanction === 'mute') {
          await target.timeout(60 * 60 * 1000, `Score comportemental: ${row.score_comportement}`).catch(() => undefined);
          logger.logToDiscord(guild, `Auto-sanction: mute 1h pour <@${userId}> (score ${row.score_comportement} ≤ ${threshold.score})`);
        } else if (threshold.sanction === 'kick') {
          await target.kick(`Score comportemental: ${row.score_comportement}`).catch(() => undefined);
          logger.logToDiscord(guild, `Auto-sanction: kick pour <@${userId}> (score ${row.score_comportement} ≤ ${threshold.score})`);
        } else if (threshold.sanction === 'ban') {
          await target.ban({ reason: `Score comportemental: ${row.score_comportement}` }).catch(() => undefined);
          logger.logToDiscord(guild, `Auto-sanction: ban pour <@${userId}> (score ${row.score_comportement} ≤ ${threshold.score})`);
        }
      } catch (err) {
        logger.error('checkBehaviorThresholds error', err);
      }
      break;
    }
  }
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
  applyNitroBoost,
  runPassiveScoreRegen,
  checkBehaviorThresholds,
  getBehaviorThresholds,
  setBehaviorThresholds,
  upsertBehaviorThreshold,
  removeBehaviorThreshold,
  listBehaviorScores,
  resetBehaviorScore,
  SCORE_MAX,
  SCORE_DEFAULT,
  SCORE_FLOOR
};
