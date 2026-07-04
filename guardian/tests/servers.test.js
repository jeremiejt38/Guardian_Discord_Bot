const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../database/db');
const { addServer, listServersForGuild, setApproved } = require('../modules/servers/servers');

test('servers module persists and lists servers with approval flag', () => {
  initDatabase(':memory:');

  const guildId = 'g-test';
  const id = addServer(guildId, 'Test Server', 'GameX', '127.0.0.1', 1234, 's3cr3t', null, 0);
  assert.ok(id > 0);

  let list = listServersForGuild(guildId, false);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Test Server');
  assert.equal(list[0].approved, 0);

  // approve and verify
  setApproved(id, 1);
  list = listServersForGuild(guildId, true);
  assert.equal(list.length, 1);
  assert.equal(list[0].approved, 1);
});
