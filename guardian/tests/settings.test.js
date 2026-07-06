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

test('settings module sets and gets guild settings with JSON serialization', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase, getDb } = freshModule('../database/db');
  initDatabase(tempDbPath);

  const { setGuildSetting, getGuildSetting, getBehaviorInterfaceData } = freshModule('../modules/config/settings');

  assert.equal(getGuildSetting('g1', 'mod', 'key1', 'default'), 'default');

  setGuildSetting('g1', 'mod', 'key1', 'value1');
  assert.equal(getGuildSetting('g1', 'mod', 'key1', null), 'value1');

  setGuildSetting('g1', 'mod', 'key2', { nested: true, count: 42 });
  assert.deepEqual(getGuildSetting('g1', 'mod', 'key2', null), { nested: true, count: 42 });

  setGuildSetting('g1', 'mod', 'key3', [1, 2, 3]);
  assert.deepEqual(getGuildSetting('g1', 'mod', 'key3', []), [1, 2, 3]);

  setGuildSetting('g1', 'mod', 'key4', true);
  assert.equal(getGuildSetting('g1', 'mod', 'key4', false), true);

  setGuildSetting('g1', 'mod', 'key1', 'updated');
  assert.equal(getGuildSetting('g1', 'mod', 'key1', null), 'updated');

  assert.equal(getGuildSetting('g1', 'other', 'key1', 'fallback'), 'fallback');
  assert.equal(getGuildSetting('g2', 'mod', 'key1', 'fallback'), 'fallback');

  const data = getBehaviorInterfaceData('g1', [{ score: 5, sanction: 'warn' }]);
  assert.deepEqual(data.thresholds, [{ score: 5, sanction: 'warn' }]);
  assert.equal(data.pageSize, 10);

  setGuildSetting('g1', 'behavior', 'thresholds', [{ score: 3, sanction: 'mute' }]);
  const data2 = getBehaviorInterfaceData('g1');
  assert.deepEqual(data2.thresholds, [{ score: 3, sanction: 'mute' }]);

  getDb().close();
  fs.rmSync(tempDbPath, { force: true });
});
