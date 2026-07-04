const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../database/db');
const setup = require('../modules/initialisation/setup');

test('finalizeInstall runs without throwing', async () => {
  initDatabase(':memory:');
  const fakeGuild = { id: 'test-guild' };
  await setup.finalizeInstall(fakeGuild);
  assert.ok(true);
});
