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

test('gamesVocal tracks and untracks temporary voice channels', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase, getDb } = freshModule('../database/db');
  initDatabase(tempDbPath);

  const { trackTempVoice, untrackTempVoice } = freshModule('../modules/games/gamesVocal');

  const db = getDb();

  // Track a voice channel
  trackTempVoice('ch1', 'g1', 1, 'u1');
  let rows = db.prepare('SELECT * FROM vocal_temp WHERE channel_id = ?').all('ch1');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].guild_id, 'g1');
  assert.equal(rows[0].game_id, 1);
  assert.equal(rows[0].created_by, 'u1');
  assert.ok(rows[0].created_at);

  // Replace with same channel_id
  trackTempVoice('ch1', 'g1', 2, 'u2');
  rows = db.prepare('SELECT * FROM vocal_temp WHERE channel_id = ?').all('ch1');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].game_id, 2);
  assert.equal(rows[0].created_by, 'u2');

  // Track a second channel
  trackTempVoice('ch2', 'g1', 1, 'u1');
  const allRows = db.prepare('SELECT * FROM vocal_temp').all();
  assert.equal(allRows.length, 2);

  // Untrack
  untrackTempVoice('ch1');
  const remaining = db.prepare('SELECT * FROM vocal_temp').all();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].channel_id, 'ch2');

  // Untrack nonexistent (no error)
  untrackTempVoice('nonexistent');
  assert.equal(db.prepare('SELECT * FROM vocal_temp').all().length, 1);

  db.close();
  fs.rmSync(tempDbPath, { force: true });
});
