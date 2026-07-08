'use strict';

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

function makeTempDb() {
  return path.join(os.tmpdir(), `guardian-sug-${Date.now()}-${Math.random()}.db`);
}

test('STATUSES contient les 4 statuts et STATUS_KEYS a 4 éléments', () => {
  const { STATUSES, STATUS_KEYS, IDS } = require('../modules/suggestions/suggestions');
  assert.ok(STATUSES.pending);
  assert.ok(STATUSES.inprogress);
  assert.ok(STATUSES.accepted);
  assert.ok(STATUSES.rejected);
  assert.equal(STATUS_KEYS.length, 4);
  assert.equal(IDS.statusPrefix, 'suggestions:status:');
});

test('buildStatusRow — 4 boutons, disabled sur le statut courant', () => {
  const { buildStatusRow, IDS } = require('../modules/suggestions/suggestions');
  const row = buildStatusRow('thread123', 'pending');
  const data = row.toJSON();
  assert.equal(data.components.length, 4);
  const pendingBtn = data.components.find((c) => c.custom_id === `${IDS.statusPrefix}pending:thread123`);
  assert.ok(pendingBtn, 'Bouton pending introuvable');
  assert.equal(pendingBtn.disabled, true);
  const others = data.components.filter((c) => c.custom_id !== `${IDS.statusPrefix}pending:thread123`);
  assert.ok(others.every((c) => !c.disabled));
});

test('buildStatusRow — disabled sur accepted', () => {
  const { buildStatusRow, IDS } = require('../modules/suggestions/suggestions');
  const row = buildStatusRow('thread123', 'accepted');
  const data = row.toJSON();
  const acceptedBtn = data.components.find((c) => c.custom_id === `${IDS.statusPrefix}accepted:thread123`);
  assert.equal(acceptedBtn.disabled, true);
});

test('buildStatusRow — customIds contiennent le threadId', () => {
  const { buildStatusRow } = require('../modules/suggestions/suggestions');
  const row = buildStatusRow('my-thread-id', 'pending');
  const data = row.toJSON();
  assert.ok(data.components.every((c) => c.custom_id.includes('my-thread-id')));
});

test('isSuggestionThread retourne false si pas de parent', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { isSuggestionThread } = freshModule('../modules/suggestions/suggestions');
  assert.equal(isSuggestionThread({ parent: null, guildId: 'g1' }), false);
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('isSuggestionThread retourne false si suggestions_enabled = false', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { setGuildSetting } = freshModule('../modules/config/settings');
  setGuildSetting('g_sug1', 'channels', 'suggestions_enabled', false);
  const { isSuggestionThread } = freshModule('../modules/suggestions/suggestions');
  assert.equal(isSuggestionThread({ parent: { name: 'suggestions' }, guildId: 'g_sug1' }), false);
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('isSuggestionThread retourne true si channel suggestions et suggestions_enabled = true', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { setGuildSetting } = freshModule('../modules/config/settings');
  setGuildSetting('g_sug2', 'channels', 'suggestions_enabled', true);
  const { isSuggestionThread } = freshModule('../modules/suggestions/suggestions');
  assert.equal(isSuggestionThread({ parent: { name: 'suggestions' }, guildId: 'g_sug2' }), true);
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('handleSuggestionInteraction retourne false si pas un bouton', async () => {
  const { handleSuggestionInteraction } = require('../modules/suggestions/suggestions');
  const result = await handleSuggestionInteraction({ isButton: () => false, customId: 'suggestions:status:accepted:t1' });
  assert.equal(result, false);
});

test('handleSuggestionInteraction retourne false si customId hors préfixe', async () => {
  const { handleSuggestionInteraction } = require('../modules/suggestions/suggestions');
  const result = await handleSuggestionInteraction({ isButton: () => true, customId: 'other:action' });
  assert.equal(result, false);
});

test('handleSuggestionInteraction répond "feature premium" si guild est en free', async () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { handleSuggestionInteraction } = freshModule('../modules/suggestions/suggestions');
  let repliedContent = null;
  const interaction = {
    isButton: () => true,
    customId: 'suggestions:status:accepted:t2',
    guildId: 'g_free_sug',
    member: { roles: { cache: { has: () => false } } },
    reply: async ({ content }) => { repliedContent = content; },
  };
  const result = await handleSuggestionInteraction(interaction);
  assert.equal(result, true);
  assert.ok(repliedContent?.includes('Premium'), `Message premium attendu, reçu: ${repliedContent}`);
  try { fs.unlinkSync(tempDbPath); } catch {}
});
