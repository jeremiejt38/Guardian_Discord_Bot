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
  return path.join(os.tmpdir(), `guardian-tier-${Date.now()}-${Math.random()}.db`);
}

// ─── Tests getGuildTier / setGuildTier ────────────────────────────────────────

test('getGuildTier retourne free par défaut', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase, getGuildTier } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  assert.equal(getGuildTier('unknown_guild'), 'free');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('setGuildTier/getGuildTier: premium persisté correctement', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase, getGuildTier, setGuildTier } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  setGuildTier('guild_1', 'premium', null);
  assert.equal(getGuildTier('guild_1'), 'premium');
  setGuildTier('guild_1', 'free', null);
  assert.equal(getGuildTier('guild_1'), 'free');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('getGuildTier retourne free si expires_at est dans le passé', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase, getGuildTier, setGuildTier } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  setGuildTier('guild_exp', 'premium', Date.now() - 1000);
  assert.equal(getGuildTier('guild_exp'), 'free');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('getGuildTier retourne premium si expires_at est dans le futur', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase, getGuildTier, setGuildTier } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  setGuildTier('guild_fut', 'premium', Date.now() + 86400_000);
  assert.equal(getGuildTier('guild_fut'), 'premium');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('setGuildTier ignore une valeur de tier invalide (fallback free)', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase, getGuildTier, setGuildTier } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  setGuildTier('guild_inv', 'enterprise', null);
  assert.equal(getGuildTier('guild_inv'), 'free');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

// ─── Tests isPremium / checkTier / activatePremium / deactivatePremium ────────

test('tier.js — isPremium retourne false pour guild inconnue', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { isPremium } = freshModule('../modules/tier/tier');
  assert.equal(isPremium('no_guild'), false);
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('tier.js — activatePremium / isPremium / deactivatePremium', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { isPremium, activatePremium, deactivatePremium, checkTier } = freshModule('../modules/tier/tier');
  assert.equal(isPremium('g1'), false);
  activatePremium('g1', null);
  assert.equal(isPremium('g1'), true);
  assert.equal(checkTier('g1'), 'premium');
  deactivatePremium('g1');
  assert.equal(isPremium('g1'), false);
  assert.equal(checkTier('g1'), 'free');
  try { fs.unlinkSync(tempDbPath); } catch {}
});

test('tier.js — activatePremium avec durée', () => {
  const tempDbPath = makeTempDb();
  const { initDatabase, migrateDatabase } = freshModule('../database/db');
  initDatabase(tempDbPath);
  migrateDatabase();
  const { isPremium, activatePremium } = freshModule('../modules/tier/tier');
  activatePremium('g2', 30);
  assert.equal(isPremium('g2'), true);
  try { fs.unlinkSync(tempDbPath); } catch {}
});

// ─── Tests premiumGate ────────────────────────────────────────────────────────

test('premiumGate — isPremiumGateClick / GATE_PREFIX / PREMIUM_FEATURE_LABELS', () => {
  const { isPremiumGateClick, GATE_PREFIX, PREMIUM_FEATURE_LABELS } = require('../modules/tier/premiumGate');
  assert.equal(GATE_PREFIX, 'premium:gate:');
  assert.equal(isPremiumGateClick({ isButton: () => true, customId: 'premium:gate:behavior_sanctions' }), true);
  assert.equal(isPremiumGateClick({ isButton: () => true, customId: 'setup:step:next' }), false);
  assert.equal(isPremiumGateClick({ isButton: () => false, customId: 'premium:gate:x' }), false);
  const expected = ['behavior_sanctions', 'welcome_dm', 'suggestions_forum', 'server_list'];
  for (const key of expected) {
    assert.ok(PREMIUM_FEATURE_LABELS[key], `Clé manquante: ${key}`);
  }
});

test('premiumGate — buildPremiumLockButton customId / label / style', () => {
  const { buildPremiumLockButton, GATE_PREFIX } = require('../modules/tier/premiumGate');
  const { ButtonStyle } = require('discord.js');
  const btn = buildPremiumLockButton('welcome_dm', 'DM custom');
  const data = btn.toJSON();
  assert.equal(data.custom_id, `${GATE_PREFIX}welcome_dm`);
  assert.equal(data.label, '🔒 DM custom');
  assert.equal(data.disabled, false);
  assert.equal(data.style, ButtonStyle.Secondary);
});
