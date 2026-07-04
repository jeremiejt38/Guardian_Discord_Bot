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

test('database helpers support idempotent schema, CRUD and config/grade helpers', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase, getDb, setConfig, getConfig, setGrade, getGrade } = freshDbModule();
  const db = initDatabase(tempDbPath);
  initDatabase(tempDbPath);

  db.prepare(
    `INSERT INTO guilds (guild_id, setup_done, setup_hash, owner_id)
     VALUES (?, ?, ?, ?)`
  ).run('g1', 1, 'hash1', 'owner1');

  db.prepare(
    `INSERT INTO games (guild_id, name, role_id, galerie_enabled, changelog_enabled)
     VALUES (?, ?, ?, ?, ?)`
  ).run('g1', 'Valorant', 'role-game', 1, 1);

  db.prepare(
    `INSERT INTO members (guild_id, user_id, grade, join_date)
     VALUES (?, ?, ?, ?)`
  ).run('g1', 'u1', 'invite', new Date().toISOString());

  db.prepare(
    `INSERT INTO sanctions (guild_id, user_id, type, reason, applied_by, timestamp, duration, auto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run('g1', 'u1', 'warn', 'reason', 'mod1', new Date().toISOString(), null, 0);

  const guild = db.prepare('SELECT guild_id FROM guilds WHERE guild_id = ?').get('g1');
  const game = db.prepare('SELECT name FROM games WHERE guild_id = ?').get('g1');
  const member = db.prepare('SELECT user_id FROM members WHERE guild_id = ?').get('g1');
  const sanction = db.prepare('SELECT type FROM sanctions WHERE guild_id = ?').get('g1');

  assert.equal(guild.guild_id, 'g1');
  assert.equal(game.name, 'Valorant');
  assert.equal(member.user_id, 'u1');
  assert.equal(sanction.type, 'warn');

  setConfig('g1', 'config', 'k', { enabled: true });
  assert.deepEqual(getConfig('g1', 'config', 'k', null), { enabled: true });

  setGrade('g1', 'invite', 'role-invite');
  assert.equal(getGrade('g1', 'invite'), 'role-invite');

  getDb().close();
  fs.rmSync(tempDbPath, { force: true });
});
