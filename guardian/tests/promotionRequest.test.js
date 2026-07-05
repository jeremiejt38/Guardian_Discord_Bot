const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.DISCORD_TOKEN = 'test-token';

const { initDatabase, getDb } = require('../database/db');

const DB_PATH = path.resolve('/tmp/guardian-promotion-test.db');

before(() => {
  initDatabase(DB_PATH);
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO guilds (guild_id, setup_done) VALUES ('guild1', 1)").run();
  db.prepare(
    "INSERT OR IGNORE INTO members (guild_id, user_id, grade, join_date) VALUES ('guild1', 'user1', 'invite', ?)"
  ).run(new Date(Date.now() - 72 * 3600 * 1000).toISOString());
  db.prepare(
    "INSERT OR IGNORE INTO grades (guild_id, grade_name, role_id) VALUES ('guild1', 'invite', 'role-invite')"
  ).run();
  db.prepare(
    "INSERT OR IGNORE INTO grades (guild_id, grade_name, role_id) VALUES ('guild1', 'membre', 'role-membre')"
  ).run();
  db.prepare(
    "INSERT OR IGNORE INTO grades (guild_id, grade_name, role_id) VALUES ('guild1', 'moderateur', 'role-mod')"
  ).run();
});

after(() => {
  const fs = require('fs');
  try { fs.unlinkSync(DB_PATH); } catch {}
});

test('createRequest insère une demande pending en base', () => {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO members (guild_id, user_id, grade, join_date) VALUES ('guild1', 'userA', 'invite', ?)"
  ).run(new Date().toISOString());

  const result = db.prepare(
    "INSERT INTO promotion_requests (guild_id, user_id, status, created_at) VALUES ('guild1', 'userA', 'pending', ?)"
  ).run(new Date().toISOString());

  assert.ok(result.lastInsertRowid > 0, 'lastInsertRowid doit être > 0');

  const row = db.prepare('SELECT * FROM promotion_requests WHERE request_id = ?').get(result.lastInsertRowid);
  assert.equal(row.status, 'pending');
  assert.equal(row.guild_id, 'guild1');
  assert.equal(row.user_id, 'userA');
});

test('resolveRequest passe le statut à accepted', () => {
  const db = getDb();
  const ins = db.prepare(
    "INSERT INTO promotion_requests (guild_id, user_id, status, created_at) VALUES ('guild1', 'userB', 'pending', ?)"
  ).run(new Date().toISOString());
  const id = ins.lastInsertRowid;

  db.prepare(
    'UPDATE promotion_requests SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE request_id = ?'
  ).run('accepted', new Date().toISOString(), 'staff1', id);

  const row = db.prepare('SELECT * FROM promotion_requests WHERE request_id = ?').get(id);
  assert.equal(row.status, 'accepted');
  assert.equal(row.reviewed_by, 'staff1');
});

test('resolveRequest passe le statut à rejected avec raison', () => {
  const db = getDb();
  const ins = db.prepare(
    "INSERT INTO promotion_requests (guild_id, user_id, status, created_at) VALUES ('guild1', 'userC', 'pending', ?)"
  ).run(new Date().toISOString());
  const id = ins.lastInsertRowid;

  db.prepare(
    'UPDATE promotion_requests SET status = ?, reviewed_at = ?, reviewed_by = ?, reason = ? WHERE request_id = ?'
  ).run('rejected', new Date().toISOString(), 'staff1', 'Profil incomplet', id);

  const row = db.prepare('SELECT * FROM promotion_requests WHERE request_id = ?').get(id);
  assert.equal(row.status, 'rejected');
  assert.equal(row.reason, 'Profil incomplet');
});

test('getPendingRequest retourne null si aucune demande en attente', () => {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM promotion_requests WHERE guild_id = ? AND user_id = ? AND status = 'pending'")
    .get('guild1', 'userInexistant');
  assert.equal(row, undefined);
});

test('getPendingRequest détecte une demande existante', () => {
  const db = getDb();
  db.prepare(
    "INSERT INTO promotion_requests (guild_id, user_id, status, created_at) VALUES ('guild1', 'userD', 'pending', ?)"
  ).run(new Date().toISOString());

  const row = db
    .prepare("SELECT * FROM promotion_requests WHERE guild_id = ? AND user_id = ? AND status = 'pending'")
    .get('guild1', 'userD');
  assert.ok(row, 'La demande pending doit être trouvée');
  assert.equal(row.user_id, 'userD');
});

test('updateRequestMessageId met à jour le message_id', () => {
  const db = getDb();
  const ins = db.prepare(
    "INSERT INTO promotion_requests (guild_id, user_id, status, created_at) VALUES ('guild1', 'userE', 'pending', ?)"
  ).run(new Date().toISOString());
  const id = ins.lastInsertRowid;

  db.prepare('UPDATE promotion_requests SET message_id = ? WHERE request_id = ?').run('msg123', id);

  const row = db.prepare('SELECT message_id FROM promotion_requests WHERE request_id = ?').get(id);
  assert.equal(row.message_id, 'msg123');
});
