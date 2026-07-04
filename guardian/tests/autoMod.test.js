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

test('autoMod handles anti-spam, blacklist and slow mode config', async () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase, getDb } = freshModule('../database/db');
  initDatabase(tempDbPath);

  const autoMod = freshModule('../modules/moderation/autoMod');

  const message = {
    guildId: 'g1',
    content: 'hello forbidden world',
    author: { id: 'u1' },
    client: { user: { id: 'bot1' } }
  };

  assert.equal(autoMod.containsBlacklistedWord(message.content, ['Forbidden']), true);
  assert.equal(autoMod.evaluateBlacklist(message, { words: ['forbidden'] }), true);
  assert.equal(autoMod.evaluateBlacklist(message, { words: ['forbidden'], exemptUserIds: ['u1'] }), false);

  let detected = false;
  for (let i = 0; i < 7; i += 1) {
    detected = autoMod.evaluateSpam(message, { limitCount: 5, periodMs: 999999 });
  }
  assert.equal(detected, true);

  const channel = {
    id: 'c1',
    guild: { id: 'g1' },
    currentRateLimit: 0,
    async setRateLimitPerUser(seconds) {
      this.currentRateLimit = seconds;
    }
  };

  const applied = await autoMod.configureSlowMode(channel, 30000);
  assert.equal(applied, 21600);
  assert.equal(channel.currentRateLimit, 21600);

  const config = autoMod.getSlowModeConfig('g1');
  assert.equal(config.c1, 21600);

  getDb().close();
  fs.rmSync(tempDbPath, { force: true });
});
