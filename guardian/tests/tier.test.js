'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ─── Setup DB en mémoire ──────────────────────────────────────────────────────

let db;
before(() => {
  process.env.DATABASE_PATH = ':memory:';
  const { initDatabase, migrateDatabase } = require('../database/db');
  db = initDatabase();
  migrateDatabase();
});

after(() => {
  db.close?.();
});

// ─── Tests getGuildTier / setGuildTier ────────────────────────────────────────

describe('getGuildTier / setGuildTier', () => {
  const { getGuildTier, setGuildTier } = require('../database/db');

  beforeEach(() => {
    try { db.exec("DELETE FROM guild_tier"); } catch {}
  });

  it('retourne free par défaut (guild inconnue)', () => {
    assert.equal(getGuildTier('unknown_guild'), 'free');
  });

  it('retourne premium après setGuildTier premium', () => {
    setGuildTier('guild_1', 'premium', null);
    assert.equal(getGuildTier('guild_1'), 'premium');
  });

  it('repasse en free après setGuildTier free', () => {
    setGuildTier('guild_2', 'premium', null);
    setGuildTier('guild_2', 'free', null);
    assert.equal(getGuildTier('guild_2'), 'free');
  });

  it('retourne free si expires_at est dans le passé', () => {
    const pastTs = Date.now() - 1000;
    setGuildTier('guild_3', 'premium', pastTs);
    assert.equal(getGuildTier('guild_3'), 'free');
  });

  it('retourne premium si expires_at est dans le futur', () => {
    const futureTs = Date.now() + 86400_000;
    setGuildTier('guild_4', 'premium', futureTs);
    assert.equal(getGuildTier('guild_4'), 'premium');
  });

  it('ignore une valeur de tier invalide (fallback free)', () => {
    setGuildTier('guild_5', 'enterprise', null);
    assert.equal(getGuildTier('guild_5'), 'free');
  });
});

// ─── Tests isPremium / checkTier / activatePremium / deactivatePremium ────────

describe('tier.js — isPremium / checkTier / activatePremium / deactivatePremium', () => {
  const { isPremium, checkTier, activatePremium, deactivatePremium } = require('../modules/tier/tier');

  beforeEach(() => {
    try { db.exec("DELETE FROM guild_tier"); } catch {}
  });

  it('isPremium retourne false pour guild inconnue', () => {
    assert.equal(isPremium('no_guild'), false);
  });

  it('isPremium retourne true après activatePremium permanent', () => {
    activatePremium('g1', null);
    assert.equal(isPremium('g1'), true);
  });

  it('isPremium retourne true après activatePremium avec durée', () => {
    activatePremium('g2', 30);
    assert.equal(isPremium('g2'), true);
  });

  it('isPremium retourne false après deactivatePremium', () => {
    activatePremium('g3', null);
    deactivatePremium('g3');
    assert.equal(isPremium('g3'), false);
  });

  it('checkTier retourne premium pour guild premium', () => {
    activatePremium('g4', null);
    assert.equal(checkTier('g4'), 'premium');
  });

  it('checkTier retourne free pour guild free', () => {
    assert.equal(checkTier('g5'), 'free');
  });
});

// ─── Tests premiumGate ────────────────────────────────────────────────────────

describe('premiumGate — isPremiumGateClick', () => {
  const { isPremiumGateClick, GATE_PREFIX, PREMIUM_FEATURE_LABELS } = require('../modules/tier/premiumGate');

  it('retourne true pour un customId premium:gate:*', () => {
    const fakeInteraction = { isButton: () => true, customId: 'premium:gate:behavior_sanctions' };
    assert.equal(isPremiumGateClick(fakeInteraction), true);
  });

  it('retourne false pour un customId quelconque', () => {
    const fakeInteraction = { isButton: () => true, customId: 'setup:step:next' };
    assert.equal(isPremiumGateClick(fakeInteraction), false);
  });

  it('retourne false si pas un bouton', () => {
    const fakeInteraction = { isButton: () => false, customId: 'premium:gate:x' };
    assert.equal(isPremiumGateClick(fakeInteraction), false);
  });

  it('GATE_PREFIX est correct', () => {
    assert.equal(GATE_PREFIX, 'premium:gate:');
  });

  it('PREMIUM_FEATURE_LABELS contient les clés attendues', () => {
    const expected = ['behavior_sanctions', 'welcome_dm', 'suggestions_forum', 'server_list'];
    for (const key of expected) {
      assert.ok(PREMIUM_FEATURE_LABELS[key], `Clé manquante: ${key}`);
    }
  });
});

// ─── Tests buildPremiumLockButton ─────────────────────────────────────────────

describe('premiumGate — buildPremiumLockButton', () => {
  const { buildPremiumLockButton, GATE_PREFIX } = require('../modules/tier/premiumGate');
  const { ButtonStyle } = require('discord.js');

  it('crée un bouton avec le bon customId', () => {
    const btn = buildPremiumLockButton('welcome_dm', 'DM custom');
    const data = btn.toJSON();
    assert.equal(data.custom_id, `${GATE_PREFIX}welcome_dm`);
  });

  it('crée un bouton avec le bon label (avec 🔒)', () => {
    const btn = buildPremiumLockButton('welcome_dm', 'DM custom');
    const data = btn.toJSON();
    assert.equal(data.label, '🔒 DM custom');
  });

  it('le bouton est activé (disabled: false)', () => {
    const btn = buildPremiumLockButton('welcome_dm', 'DM custom');
    const data = btn.toJSON();
    assert.equal(data.disabled, false);
  });

  it('style par défaut = Secondary', () => {
    const btn = buildPremiumLockButton('welcome_dm', 'DM custom');
    const data = btn.toJSON();
    assert.equal(data.style, ButtonStyle.Secondary);
  });
});
