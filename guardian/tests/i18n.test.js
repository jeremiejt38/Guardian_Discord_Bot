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

test('i18n module loads locales and translates with interpolation', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase, getDb } = freshModule('../database/db');
  initDatabase(tempDbPath);

  const i18n = freshModule('../modules/i18n');

  const langs = i18n.getAvailableLanguages();
  assert.ok(Array.isArray(langs));
  assert.ok(langs.includes('fr'));

  assert.equal(i18n.DEFAULT_LANGUAGE, 'en');

  const label = i18n.getLanguageLabel('fr');
  assert.ok(typeof label === 'string');
  assert.ok(label.length > 0);

  const unknownLabel = i18n.getLanguageLabel('zz');
  assert.equal(unknownLabel, 'zz');

  const defaultLang = i18n.getGuildLanguage(null);
  assert.equal(defaultLang, 'en');

  const guildLang = i18n.getGuildLanguage('nonexistent-guild');
  assert.equal(guildLang, 'en');

  const result = i18n.tForLanguage('fr', 'nonexistent.key.path');
  assert.equal(result, 'nonexistent.key.path');

  i18n.setGuildLanguage('g1', 'fr');
  assert.equal(i18n.getGuildLanguage('g1'), 'fr');

  i18n.setGuildLanguage('g1', 'invalid-lang');
  assert.equal(i18n.getGuildLanguage('g1'), 'fr');

  getDb().close();
  fs.rmSync(tempDbPath, { force: true });
});

test('new locales es/pt/it are loaded and have required keys', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);
  const { initDatabase, getDb } = freshModule('../database/db');
  initDatabase(tempDbPath);
  const i18n = freshModule('../modules/i18n');

  const langs = i18n.getAvailableLanguages();
  for (const code of ['es', 'pt', 'it']) {
    assert.ok(langs.includes(code), `Language ${code} should be available`);
    const label = i18n.getLanguageLabel(code);
    assert.ok(label.length > 0, `Label for ${code} should not be empty`);
    const translated = i18n.tForLanguage(code, 'setup.finalizeButton');
    assert.ok(typeof translated === 'string' && translated !== 'setup.finalizeButton', `setup.finalizeButton should be translated in ${code}`);
    const continueBtn = i18n.tForLanguage(code, 'setup.continueButton');
    assert.ok(typeof continueBtn === 'string' && continueBtn !== 'setup.continueButton', `setup.continueButton should be translated in ${code}`);
  }

  getDb().close();
  fs.rmSync(tempDbPath, { force: true });
});
