const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

function freshDbModule() {
  const dbModulePath = require.resolve('../database/db');
  delete require.cache[dbModulePath];
  return require('../database/db');
}

test('initDatabase creates required schema tables', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase } = freshDbModule();
  const db = initDatabase(tempDbPath);

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((row) => row.name);

  assert.ok(tables.includes('guilds'));
  assert.ok(tables.includes('schema_version'));
  assert.ok(tables.includes('guild_config'));
  assert.ok(tables.includes('grades'));
  assert.ok(tables.includes('games'));
  assert.ok(tables.includes('member_games'));
  assert.ok(tables.includes('members'));
  assert.ok(tables.includes('sanctions'));
  assert.ok(tables.includes('changelogs_seen'));
  assert.ok(tables.includes('servers_jeu'));
  assert.ok(tables.includes('parrainage'));
  assert.ok(tables.includes('vocal_temp'));
  assert.ok(tables.includes('promotion_requests'));
  assert.ok(tables.includes('reports'));

  const serverColumns = db.prepare("PRAGMA table_info(servers_jeu)").all().map((column) => column.name);
  assert.ok(serverColumns.includes('status_message_id'));

  const versionRow = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get();
  assert.equal(versionRow.version, 1);

  db.close();
  fs.rmSync(tempDbPath, { force: true });
});
