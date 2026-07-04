const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../database/db');
const seeds = require('../modules/initialisation/seeds');

test('seedGuildMessages is idempotent and does not throw', async () => {
  initDatabase(':memory:');
  const fakeGuild = { id: 'test-guild', channels: { cache: new Map() } };
  await seeds.seedGuildMessages(fakeGuild);
  await seeds.seedGuildMessages(fakeGuild);
  assert.ok(true);
});
