const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase, getDb } = require('../database/db');
const { exportGuildData, encodeSnapshot, decodeSnapshot } = require('../modules/migration/guildExport');
const { importGuildData, validateSnapshot } = require('../modules/migration/guildImport');

let counter = 0;
function initFreshDb() {
  if (counter === 0) {
    initDatabase(':memory:');
  }
  counter += 1;
}

function seedTestData(guildId) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO guilds (guild_id, setup_done, language) VALUES (?, 1, ?)').run(guildId, 'fr');
  db.prepare('INSERT INTO guild_config (guild_id, module, key, value) VALUES (?, ?, ?, ?)').run(guildId, 'members', 'bio_required', '1');
  db.prepare('INSERT INTO grades (guild_id, grade_name, role_id) VALUES (?, ?, ?)').run(guildId, 'membre', 'role-123');
  db.prepare('INSERT INTO games (guild_id, name, steam_app_id) VALUES (?, ?, ?)').run(guildId, 'Counter-Strike 2', '730');
  db.prepare('INSERT INTO members (guild_id, user_id, grade, join_date, score_comportement) VALUES (?, ?, ?, ?, ?)').run(guildId, 'user-1', 'membre', '2024-01-01', 5);
}

function countRows(guildId, table) {
  const db = getDb();
  try {
    return db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE guild_id = ?`).get(guildId).c;
  } catch {
    return 0;
  }
}

test('exportGuildData captures guild data preserving the original guildId', () => {
  initFreshDb();
  const guildId = 'guild-source-1';
  seedTestData(guildId);

  const snapshot = exportGuildData(guildId);

  assert.ok(validateSnapshot(snapshot), 'snapshot should be valid');
  assert.equal(snapshot.originalGuildId, guildId);
  assert.equal(snapshot.guildId, guildId);
  assert.ok(snapshot.tables.guilds.length > 0, 'guilds should be exported');
  assert.ok(snapshot.tables.grades.length > 0, 'grades should be exported');
  assert.equal(snapshot.tables.grades[0].guild_id, guildId);
});

test('importGuildData restores data under a new guild id', () => {
  initFreshDb();
  const sourceId = 'guild-source-2';
  const targetId = 'guild-target-2';
  seedTestData(sourceId);

  const snapshot = exportGuildData(sourceId);
  const result = importGuildData(snapshot, targetId, { deleteExisting: true });

  assert.equal(result.totalRows, 5, 'should import 5 rows');
  assert.equal(countRows(targetId, 'guild_config'), 1);
  assert.equal(countRows(targetId, 'grades'), 1);
  assert.equal(countRows(targetId, 'games'), 1);
  assert.equal(countRows(targetId, 'members'), 1);
  assert.equal(countRows(sourceId, 'guild_config'), 1, 'source data should remain');
});

test('importGuildData works with the same guildId', () => {
  initFreshDb();
  const guildId = 'guild-same-4';
  seedTestData(guildId);

  const snapshot = exportGuildData(guildId);
  const result = importGuildData(snapshot, guildId, { deleteExisting: true });

  assert.equal(result.totalRows, 5, 'should import 5 rows');
  assert.equal(countRows(guildId, 'guild_config'), 1);
});

test('encode/decode snapshot roundtrip is lossless', () => {
  initFreshDb();
  const guildId = 'guild-enc-5';
  seedTestData(guildId);

  const encoded = encodeSnapshot(exportGuildData(guildId));
  const decoded = decodeSnapshot(encoded);

  assert.ok(decoded);
  assert.equal(decoded.originalGuildId, guildId);
});
