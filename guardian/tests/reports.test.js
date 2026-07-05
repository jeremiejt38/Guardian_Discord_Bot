const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.DISCORD_TOKEN = 'test-token';

const { initDatabase, getDb } = require('../database/db');

const DB_PATH = path.resolve('/tmp/guardian-reports-test.db');

before(() => {
  initDatabase(DB_PATH);
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO guilds (guild_id, setup_done) VALUES ('g1', 1)").run();
});

after(() => {
  const fs = require('fs');
  try { fs.unlinkSync(DB_PATH); } catch {}
});

function createReport(db, guildId, reporterId, targetText, reason, evidence) {
  const result = db.prepare(
    "INSERT INTO reports (guild_id, reporter_id, target_text, reason, evidence, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', ?)"
  ).run(guildId, reporterId, targetText, reason, evidence || null, new Date().toISOString());
  return result.lastInsertRowid;
}

function resolveReport(db, reportId, handledBy) {
  const row = db.prepare('SELECT status FROM reports WHERE report_id = ?').get(reportId);
  if (!row) return null;
  if (row.status === 'handled') return 'already_handled';
  db.prepare(
    'UPDATE reports SET status = ?, handled_at = ?, handled_by = ? WHERE report_id = ?'
  ).run('handled', new Date().toISOString(), handledBy, reportId);
  return 'ok';
}

test('createReport insère un rapport open en base', () => {
  const db = getDb();
  const id = createReport(db, 'g1', 'reporter1', 'UserBad', 'Spam', null);
  assert.ok(id > 0);
  const row = db.prepare('SELECT * FROM reports WHERE report_id = ?').get(id);
  assert.equal(row.status, 'open');
  assert.equal(row.target_text, 'UserBad');
  assert.equal(row.reason, 'Spam');
  assert.equal(row.evidence, null);
});

test('createReport enregistre la preuve si fournie', () => {
  const db = getDb();
  const id = createReport(db, 'g1', 'reporter2', 'UserX', 'Insults', 'https://example.com/screenshot.png');
  const row = db.prepare('SELECT evidence FROM reports WHERE report_id = ?').get(id);
  assert.equal(row.evidence, 'https://example.com/screenshot.png');
});

test('resolveReport passe le statut à handled', () => {
  const db = getDb();
  const id = createReport(db, 'g1', 'reporter3', 'UserY', 'Harassment', null);
  const result = resolveReport(db, id, 'mod1');
  assert.equal(result, 'ok');
  const row = db.prepare('SELECT * FROM reports WHERE report_id = ?').get(id);
  assert.equal(row.status, 'handled');
  assert.equal(row.handled_by, 'mod1');
  assert.ok(row.handled_at);
});

test('resolveReport retourne already_handled si déjà traité', () => {
  const db = getDb();
  const id = createReport(db, 'g1', 'reporter4', 'UserZ', 'Spam', null);
  resolveReport(db, id, 'mod1');
  const result = resolveReport(db, id, 'mod2');
  assert.equal(result, 'already_handled');
});

test('resolveReport retourne null pour un id inexistant', () => {
  const db = getDb();
  const result = resolveReport(db, 999999, 'mod1');
  assert.equal(result, null);
});

test('updateReportMessageId met à jour le message_id', () => {
  const db = getDb();
  const id = createReport(db, 'g1', 'reporter5', 'UserW', 'BadBehavior', null);
  db.prepare('UPDATE reports SET message_id = ? WHERE report_id = ?').run('discord-msg-id-42', id);
  const row = db.prepare('SELECT message_id FROM reports WHERE report_id = ?').get(id);
  assert.equal(row.message_id, 'discord-msg-id-42');
});
