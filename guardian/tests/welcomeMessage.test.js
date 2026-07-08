'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

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

describe('renderWelcomeTemplate', () => {
  const { renderWelcomeTemplate } = require('../modules/members/welcomeMessage');

  it('remplace {name}', () => {
    assert.equal(renderWelcomeTemplate('Bonjour {name}!', { name: 'Alice' }), 'Bonjour Alice!');
  });

  it('remplace {server}', () => {
    assert.equal(renderWelcomeTemplate('Bienvenue sur {server}', { server: 'MaGuilde' }), 'Bienvenue sur MaGuilde');
  });

  it('remplace {delay}', () => {
    assert.equal(renderWelcomeTemplate('Attends {delay}h', { delay: 48 }), 'Attends 48h');
  });

  it('remplace {grade}', () => {
    assert.equal(renderWelcomeTemplate('Tu es {grade}', { grade: 'Invité' }), 'Tu es Invité');
  });

  it('remplace toutes les variables en même temps', () => {
    const tpl = 'Salut {name} ! Bienvenue sur {server}. Tu es {grade}. Délai : {delay}h.';
    const vars = { name: 'Bob', server: 'Test', grade: 'Membre', delay: 24 };
    const result = renderWelcomeTemplate(tpl, vars);
    assert.equal(result, 'Salut Bob ! Bienvenue sur Test. Tu es Membre. Délai : 24h.');
  });

  it('remplace plusieurs occurrences de la même variable', () => {
    assert.equal(renderWelcomeTemplate('{name} {name}', { name: 'X' }), 'X X');
  });

  it('retourne chaîne vide si template null', () => {
    assert.equal(renderWelcomeTemplate(null, { name: 'Bob' }), '');
  });

  it('laisse intactes les variables non fournies', () => {
    assert.equal(renderWelcomeTemplate('Bonjour {name}', {}), 'Bonjour ');
  });
});

describe('getWelcomeMessage / setWelcomeMessage', () => {
  const { getWelcomeMessage, setWelcomeMessage } = require('../modules/members/welcomeMessage');
  const { activatePremium, deactivatePremium } = require('../modules/tier/tier');

  beforeEach(() => {
    try { db.exec("DELETE FROM guild_config WHERE module = 'members' AND key = 'welcome_message'"); } catch {}
    try { db.exec("DELETE FROM guild_tier"); } catch {}
  });

  it('retourne null par défaut', () => {
    assert.equal(getWelcomeMessage('g_wm1'), null);
  });

  it('retourne le template après setWelcomeMessage', () => {
    setWelcomeMessage('g_wm2', 'Bonjour {name}!');
    assert.equal(getWelcomeMessage('g_wm2'), 'Bonjour {name}!');
  });

  it('efface le template avec setWelcomeMessage(null)', () => {
    setWelcomeMessage('g_wm3', 'template');
    setWelcomeMessage('g_wm3', null);
    assert.equal(getWelcomeMessage('g_wm3'), null);
  });
});

describe('buildCustomWelcomeDm', () => {
  const { buildCustomWelcomeDm, setWelcomeMessage } = require('../modules/members/welcomeMessage');
  const { activatePremium, deactivatePremium } = require('../modules/tier/tier');

  beforeEach(() => {
    try { db.exec("DELETE FROM guild_config WHERE module = 'members' AND key = 'welcome_message'"); } catch {}
    try { db.exec("DELETE FROM guild_tier"); } catch {}
  });

  const fakeMember = (displayName, guildName) => ({
    displayName,
    user: { username: displayName },
    guild: { name: guildName, id: 'g_dm1' },
  });

  it('retourne null en mode free même avec template', () => {
    setWelcomeMessage('g_dm1', 'Bonjour {name}');
    const result = buildCustomWelcomeDm(fakeMember('Alice', 'Test'), 'g_dm1', {});
    assert.equal(result, null);
  });

  it('retourne null en mode premium sans template', () => {
    activatePremium('g_dm2', null);
    const member = { ...fakeMember('Alice', 'Test'), guild: { name: 'Test', id: 'g_dm2' } };
    const result = buildCustomWelcomeDm(member, 'g_dm2', {});
    assert.equal(result, null);
  });

  it('retourne le DM interpolé en mode premium avec template', () => {
    activatePremium('g_dm3', null);
    setWelcomeMessage('g_dm3', 'Salut {name} sur {server}!');
    const member = { displayName: 'Bob', user: { username: 'Bob' }, guild: { name: 'MySrv', id: 'g_dm3' } };
    const result = buildCustomWelcomeDm(member, 'g_dm3', { grade: 'Invité', delayHours: 48 });
    assert.equal(result, 'Salut Bob sur MySrv!');
  });
});
