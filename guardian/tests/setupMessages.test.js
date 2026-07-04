const test = require('node:test');
const assert = require('node:assert/strict');
const { tForLanguage } = require('../modules/i18n');

test('welcome message interpolates member, guild and delay for fr and en', () => {
  for (const lang of ['fr', 'en']) {
    const rendered = tForLanguage(lang, 'members.welcome', {
      member: '@Bob',
      guild: 'MyGuild',
      delay: 48
    });
    assert.match(rendered, /@Bob/);
    assert.match(rendered, /MyGuild/);
    assert.match(rendered, /48/);
  }
});

test('setup summary interpolates guild name and promotion delay', () => {
  for (const lang of ['fr', 'en']) {
    const rendered = tForLanguage(lang, 'setup.summary', { guild: 'Alpha', delay: 72 });
    assert.notEqual(rendered, 'setup.summary');
    assert.match(rendered, /Alpha/);
    assert.match(rendered, /72/);
  }
});

test('new setup and info keys exist in fr and en locales', () => {
  const keys = [
    'setup.startButton',
    'init.welcomeInfo',
    'init.rules',
    'init.announcements',
    'init.faqPostTitle',
    'init.suggestionsPostTitle',
    'init.suggestionsIntro'
  ];

  for (const lang of ['fr', 'en']) {
    for (const key of keys) {
      const value = tForLanguage(lang, key, { index: 1 });
      assert.notEqual(value, key, `${key} missing in ${lang}`);
    }
  }
});
