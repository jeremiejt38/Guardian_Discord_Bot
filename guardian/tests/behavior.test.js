const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

function freshModule(modulePath) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(modulePath);
}

test('behavior module increments score, manages thresholds and reset', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase, getDb } = freshModule('../database/db');
  initDatabase(tempDbPath);

  const db = getDb();
  db.prepare(
    `INSERT INTO members (guild_id, user_id, grade, join_date, score_comportement)
     VALUES (?, ?, ?, ?, ?)`
  ).run('g1', 'u1', 'invite', new Date().toISOString(), 0);

  const {
    incrementBehaviorScore,
    upsertBehaviorThreshold,
    removeBehaviorThreshold,
    getBehaviorThresholds,
    listBehaviorScores,
    resetBehaviorScore
  } = freshModule('../modules/moderation/behavior');

  const score = incrementBehaviorScore('g1', 'u1', 2);
  assert.equal(score, 2);

  upsertBehaviorThreshold('g1', 3, 'warn');
  upsertBehaviorThreshold('g1', 5, 'mute');
  assert.deepEqual(getBehaviorThresholds('g1'), [
    { score: 3, sanction: 'warn' },
    { score: 5, sanction: 'mute' }
  ]);

  removeBehaviorThreshold('g1', 3);
  assert.deepEqual(getBehaviorThresholds('g1'), [{ score: 5, sanction: 'mute' }]);

  const page = listBehaviorScores('g1', 0, 10);
  assert.equal(page.total, 1);
  assert.equal(page.rows[0].user_id, 'u1');

  resetBehaviorScore(
    {
      id: 'g1',
      channels: { cache: { find: () => null } }
    },
    'u1',
    'owner1'
  );

  const resetRow = db.prepare('SELECT score_comportement FROM members WHERE guild_id = ? AND user_id = ?').get('g1', 'u1');
  assert.equal(resetRow.score_comportement, 0);

  db.close();
  fs.rmSync(tempDbPath, { force: true });
});
