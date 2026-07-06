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

  assert.equal(i18n.DEFAULT_LANGUAGE, 'fr');

  const label = i18n.getLanguageLabel('fr');
  assert.ok(typeof label === 'string');
  assert.ok(label.length > 0);

  const unknownLabel = i18n.getLanguageLabel('zz');
  assert.equal(unknownLabel, 'zz');

  const defaultLang = i18n.getGuildLanguage(null);
  assert.equal(defaultLang, 'fr');

  const guildLang = i18n.getGuildLanguage('nonexistent-guild');
  assert.equal(guildLang, 'fr');

  const result = i18n.tForLanguage('fr', 'nonexistent.key.path');
  assert.equal(result, 'nonexistent.key.path');

  i18n.setGuildLanguage('g1', 'fr');
  assert.equal(i18n.getGuildLanguage('g1'), 'fr');

  i18n.setGuildLanguage('g1', 'invalid-lang');
  assert.equal(i18n.getGuildLanguage('g1'), 'fr');

  getDb().close();
  fs.rmSync(tempDbPath, { force: true });
});
