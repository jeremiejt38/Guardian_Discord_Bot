const test = require('node:test');
const assert = require('node:assert/strict');

test('normalizeChannelName produces valid Discord channel names', () => {
  // Replicate the pure function from serverGamesManager.js
  function normalizeChannelName(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'jeu';
  }

  assert.equal(normalizeChannelName('Valorant'), 'valorant');
  assert.equal(normalizeChannelName('Counter-Strike 2'), 'counter-strike-2');
  assert.equal(normalizeChannelName('Héros de Légende'), 'heros-de-legende');
  assert.equal(normalizeChannelName('  Multiple   Spaces  '), 'multiple-spaces');
  assert.equal(normalizeChannelName('Game: édition spéciale!'), 'game-edition-speciale');
  assert.equal(normalizeChannelName(''), 'jeu');
  assert.equal(normalizeChannelName(null), 'jeu');
  assert.equal(normalizeChannelName(undefined), 'jeu');

  const longName = 'A'.repeat(200);
  assert.ok(normalizeChannelName(longName).length <= 90);
});

test('parseBooleanValue handles various boolean-like strings', () => {
  function parseBooleanValue(raw, fallback = false) {
    const value = String(raw || '').trim().toLowerCase();
    if (['1', 'true', 'oui', 'on', 'yes', 'y'].includes(value)) {
      return true;
    }
    if (['0', 'false', 'non', 'off', 'no', 'n'].includes(value)) {
      return false;
    }
    return fallback;
  }

  assert.equal(parseBooleanValue('true'), true);
  assert.equal(parseBooleanValue('1'), true);
  assert.equal(parseBooleanValue('oui'), true);
  assert.equal(parseBooleanValue('on'), true);
  assert.equal(parseBooleanValue('yes'), true);
  assert.equal(parseBooleanValue('y'), true);
  assert.equal(parseBooleanValue('TRUE'), true);
  assert.equal(parseBooleanValue('OUI'), true);

  assert.equal(parseBooleanValue('false'), false);
  assert.equal(parseBooleanValue('0'), false);
  assert.equal(parseBooleanValue('non'), false);
  assert.equal(parseBooleanValue('off'), false);
  assert.equal(parseBooleanValue('no'), false);
  assert.equal(parseBooleanValue('n'), false);
  assert.equal(parseBooleanValue('FALSE'), false);

  assert.equal(parseBooleanValue('maybe', true), true);
  assert.equal(parseBooleanValue('maybe', false), false);
  assert.equal(parseBooleanValue('', true), true);
  assert.equal(parseBooleanValue(null, true), true);
});
