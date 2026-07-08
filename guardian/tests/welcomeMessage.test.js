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
  return path.join(os.tmpdir(), `guardian-wm-${Date.now()}-${Math.random()}.db`);
}

test('renderWelcomeTemplate — remplace toutes les variables', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { renderWelcomeTemplate } = freshModule('../modules/members/welcomeMessage');
  assert.equal(renderWelcomeTemplate('Bonjour {name}!', { name: 'Alice' }), 'Bonjour Alice!');
  assert.equal(renderWelcomeTemplate('Bienvenue sur {server}', { server: 'MaGuilde' }), 'Bienvenue sur MaGuilde');
  assert.equal(renderWelcomeTemplate('Attends {delay}h', { delay: 48 }), 'Attends 48h');
  assert.equal(renderWelcomeTemplate('Tu es {grade}', { grade: 'Invité' }), 'Tu es Invité');
  const tpl = 'Salut {name} ! Bienvenue sur {server}. Tu es {grade}. Délai : {delay}h.';
  assert.equal(
    renderWelcomeTemplate(tpl, { name: 'Bob', server: 'Test', grade: 'Membre', delay: 24 }),
    'Salut Bob ! Bienvenue sur Test. Tu es Membre. Délai : 24h.'
  );
  assert.equal(renderWelcomeTemplate('{name} {name}', { name: 'X' }), 'X X');
  assert.equal(renderWelcomeTemplate(null, { name: 'Bob' }), '');
  assert.equal(renderWelcomeTemplate('Bonjour {name}', {}), 'Bonjour ');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('getWelcomeMessage / setWelcomeMessage persistence', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { getWelcomeMessage, setWelcomeMessage } = freshModule('../modules/members/welcomeMessage');
  assert.equal(getWelcomeMessage('g_wm1'), null);
  setWelcomeMessage('g_wm2', 'Bonjour {name}!');
  assert.equal(getWelcomeMessage('g_wm2'), 'Bonjour {name}!');
  setWelcomeMessage('g_wm3', 'template');
  setWelcomeMessage('g_wm3', null);
  assert.equal(getWelcomeMessage('g_wm3'), null);
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('buildCustomWelcomeDm — retourne null en free même avec template', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { setWelcomeMessage, buildCustomWelcomeDm } = freshModule('../modules/members/welcomeMessage');
  setWelcomeMessage('g_dm1', 'Bonjour {name}');
  const fakeMember = { displayName: 'Alice', user: { username: 'Alice' }, guild: { name: 'Test', id: 'g_dm1' } };
  assert.equal(buildCustomWelcomeDm(fakeMember, 'g_dm1', {}), null);
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('buildCustomWelcomeDm — retourne null en premium sans template', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { activatePremium } = freshModule('../modules/tier/tier');
  activatePremium('g_dm2', null);
  const { buildCustomWelcomeDm } = freshModule('../modules/members/welcomeMessage');
  const member = { displayName: 'Alice', user: { username: 'Alice' }, guild: { name: 'Test', id: 'g_dm2' } };
  assert.equal(buildCustomWelcomeDm(member, 'g_dm2', {}), null);
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('buildCustomWelcomeDm — retourne DM interpolé en premium avec template', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { activatePremium } = freshModule('../modules/tier/tier');
  activatePremium('g_dm3', null);
  const { setWelcomeMessage, buildCustomWelcomeDm } = freshModule('../modules/members/welcomeMessage');
  setWelcomeMessage('g_dm3', 'Salut {name} sur {server}!');
  const member = { displayName: 'Bob', user: { username: 'Bob' }, guild: { name: 'MySrv', id: 'g_dm3' } };
  const result = buildCustomWelcomeDm(member, 'g_dm3', { grade: 'Invité', delayHours: 48 });
  assert.equal(result, 'Salut Bob sur MySrv!');
  try { fs.unlinkSync(tempDbPath); } catch {}
});
