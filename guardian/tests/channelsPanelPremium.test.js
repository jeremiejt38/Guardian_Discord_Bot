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
  return path.join(os.tmpdir(), `guardian-cp-${Date.now()}-${Math.random()}.db`);
}

const { ButtonStyle } = require('discord.js');
const { GATE_PREFIX } = require('../modules/tier/premiumGate');

test('channelsPanel buildRows — retourne cadenas pour suggestions et server_list en free', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { buildRows } = freshModule('../modules/config/channelsPanel');

  const rows = buildRows('g_free_cp');
  const allButtons = rows.flatMap((row) => row.toJSON().components);

  const suggBtn = allButtons.find((b) => b.custom_id === `${GATE_PREFIX}suggestions_forum`);
  assert.ok(suggBtn, 'Bouton cadenas suggestions_forum attendu');
  assert.ok(suggBtn.label.includes('🔒'), 'Le bouton suggestions doit avoir le cadenas');

  const srvBtn = allButtons.find((b) => b.custom_id === `${GATE_PREFIX}server_list`);
  assert.ok(srvBtn, 'Bouton cadenas server_list attendu');
  assert.ok(srvBtn.label.includes('🔒'), 'Le bouton server_list doit avoir le cadenas');

  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('channelsPanel buildRows — retourne boutons actifs pour suggestions et server_list en premium', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { activatePremium } = freshModule('../modules/tier/tier');
  activatePremium('g_prem_cp', null);
  const { buildRows } = freshModule('../modules/config/channelsPanel');

  const rows = buildRows('g_prem_cp');
  const allButtons = rows.flatMap((row) => row.toJSON().components);

  const suggBtn = allButtons.find((b) => b.custom_id === 'channels:toggle:suggestions');
  assert.ok(suggBtn, 'Bouton actif suggestions attendu');
  assert.ok(!suggBtn.label.includes('🔒'), 'Le bouton suggestions ne doit pas avoir le cadenas');

  const srvBtn = allButtons.find((b) => b.custom_id === 'channels:toggle:serveurs');
  assert.ok(srvBtn, 'Bouton actif serveurs attendu');
  assert.ok(!srvBtn.label.includes('🔒'));

  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('channelsPanel buildRows — les toggles non-premium restent toujours actifs', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { buildRows } = freshModule('../modules/config/channelsPanel');

  const rows = buildRows('g_free_cp2');
  const allButtons = rows.flatMap((row) => row.toJSON().components);

  const afkBtn = allButtons.find((b) => b.custom_id === 'channels:toggle:afk');
  assert.ok(afkBtn, 'Bouton afk attendu');
  assert.ok(!afkBtn.label.includes('🔒'), 'Le bouton afk ne doit pas être cadenassé');

  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('behaviorPanel buildPanelContent — affiche message premium en free', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { buildPanelContent } = freshModule('../modules/moderation/behaviorPanel');
  const content = buildPanelContent('g_free_beh');
  assert.ok(content.includes('🔒'), 'Le message doit contenir le cadenas');
  assert.ok(content.includes('Premium') || content.includes('premium'), 'Le message doit mentionner Premium');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('behaviorPanel buildPanelContent — affiche les seuils en premium', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { activatePremium } = freshModule('../modules/tier/tier');
  activatePremium('g_prem_beh', null);
  const { upsertBehaviorThreshold } = freshModule('../modules/moderation/behavior');
  upsertBehaviorThreshold('g_prem_beh', 100, 'warn');
  const { buildPanelContent } = freshModule('../modules/moderation/behaviorPanel');
  const content = buildPanelContent('g_prem_beh');
  assert.ok(!content.includes('🔒'), 'Pas de cadenas attendu en premium');
  assert.ok(content.includes('100'), 'Le seuil 100 doit apparaître');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('behaviorPanel buildThresholdRows — retourne cadenas en free', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { buildThresholdRows } = freshModule('../modules/moderation/behaviorPanel');
  const rows = buildThresholdRows('g_free_beh2');
  const allButtons = rows.flatMap((row) => row.toJSON().components);
  const gateBtn = allButtons.find((b) => b.custom_id?.startsWith(GATE_PREFIX));
  assert.ok(gateBtn, 'Bouton gate attendu en free');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('behaviorPanel buildThresholdRows — retourne bouton ajout en premium', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { activatePremium } = freshModule('../modules/tier/tier');
  activatePremium('g_prem_beh2', null);
  const { buildThresholdRows } = freshModule('../modules/moderation/behaviorPanel');
  const rows = buildThresholdRows('g_prem_beh2');
  const allButtons = rows.flatMap((row) => row.toJSON().components);
  const addBtn = allButtons.find((b) => b.custom_id === 'behavior:threshold:add');
  assert.ok(addBtn, 'Bouton ajout seuil attendu en premium');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('membresPanel buildRows — bouton DM Bienvenue est cadenassé en free', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { buildRows } = freshModule('../modules/config/membresPanel');
  const rows = buildRows('g_free_mp');
  const allButtons = rows.flatMap((row) => row.toJSON().components);
  const dmBtn = allButtons.find((b) => b.custom_id?.startsWith(GATE_PREFIX) && b.label?.includes('DM'));
  assert.ok(dmBtn, `Bouton DM gate attendu, reçu: ${allButtons.map((b) => b.custom_id).join(', ')}`);
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('membresPanel buildRows — bouton DM Bienvenue est actif en premium', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { activatePremium } = freshModule('../modules/tier/tier');
  activatePremium('g_prem_mp', null);
  const { buildRows } = freshModule('../modules/config/membresPanel');
  const rows = buildRows('g_prem_mp');
  const allButtons = rows.flatMap((row) => row.toJSON().components);
  const dmBtn = allButtons.find((b) => b.custom_id === 'membres:welcomedm:edit');
  assert.ok(dmBtn, 'Bouton DM actif attendu en premium');
  try { fs.unlinkSync(tempDbPath); } catch {}
});
