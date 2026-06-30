const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

function freshModule(modulePath) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(modulePath);
}

test('markGuildInstalled persists setup hash and installation state', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase, getDb } = freshModule('../database/db');
  initDatabase(tempDbPath);

  const { buildGuildHash, isGuildInstalled, markGuildInstalled } = freshModule('../modules/initialisation/checkInstall');

  const guildId = '123456';
  assert.equal(isGuildInstalled(guildId), false);

  markGuildInstalled(guildId, 'owner-1');
  assert.equal(isGuildInstalled(guildId), true);

  const expectedHash = crypto.createHash('sha256').update(guildId).digest('hex');
  assert.equal(buildGuildHash(guildId), expectedHash);

  const row = getDb().prepare('SELECT setup_hash, owner_id FROM guilds WHERE guild_id = ?').get(guildId);
  assert.equal(row.setup_hash, expectedHash);
  assert.equal(row.owner_id, 'owner-1');

  getDb().close();
  fs.rmSync(tempDbPath, { force: true });
});
