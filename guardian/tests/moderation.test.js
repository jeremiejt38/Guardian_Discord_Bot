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

test('moderation module saves sanctions and retrieves history', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase, getDb } = freshModule('../database/db');
  initDatabase(tempDbPath);

  const db = getDb();
  db.prepare(
    `INSERT INTO members (guild_id, user_id, grade, join_date, score_comportement)
     VALUES (?, ?, ?, ?, ?)`
  ).run('g1', 'u1', 'membre', new Date().toISOString(), 0);

  const { saveSanction, getSanctionsHistory, getBehaviorScore } = freshModule('../modules/moderation/moderation');

  saveSanction({
    guildId: 'g1',
    userId: 'u1',
    type: 'warn',
    reason: 'spam',
    appliedBy: 'mod1'
  });

  const history = getSanctionsHistory('g1', 'u1');
  assert.equal(history.length, 1);
  assert.equal(history[0].type, 'warn');
  assert.equal(history[0].reason, 'spam');
  assert.equal(history[0].applied_by, 'mod1');
  assert.equal(history[0].auto, 0);

  const score = getBehaviorScore('g1', 'u1');
  assert.equal(score, 1);

  saveSanction({
    guildId: 'g1',
    userId: 'u1',
    type: 'mute',
    reason: 'repeat offence',
    appliedBy: 'mod2',
    duration: '1h',
    auto: 1
  });

  const historyAfter = getSanctionsHistory('g1', 'u1');
  assert.equal(historyAfter.length, 2);
  assert.equal(historyAfter[0].type, 'mute');
  assert.equal(historyAfter[0].duration, '1h');
  assert.equal(historyAfter[0].auto, 1);

  assert.equal(getBehaviorScore('g1', 'u1'), 2);

  assert.equal(getBehaviorScore('g1', 'nonexistent'), 0);
  assert.deepEqual(getSanctionsHistory('g1', 'nonexistent'), []);

  db.close();
  fs.rmSync(tempDbPath, { force: true });
});
