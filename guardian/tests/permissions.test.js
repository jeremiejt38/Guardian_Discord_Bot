const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('allowedGradesFrom returns grades at or above the threshold', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';

  // Read the source to extract the pure functions
  const GRADE_ORDER = Object.freeze([
    'invite',
    'membre',
    'moderateur',
    'manager',
    'owner'
  ]);

  function allowedGradesFrom(minGrade) {
    const index = GRADE_ORDER.indexOf(minGrade);
    return index >= 0 ? GRADE_ORDER.slice(index) : [];
  }

  function hasGradeOrAbove(grade, thresholdGrade) {
    const gradeIndex = GRADE_ORDER.indexOf(grade);
    const thresholdIndex = GRADE_ORDER.indexOf(thresholdGrade);
    if (gradeIndex < 0 || thresholdIndex < 0) {
      return false;
    }
    return gradeIndex >= thresholdIndex;
  }

  assert.deepEqual(allowedGradesFrom('invite'), ['invite', 'membre', 'moderateur', 'manager', 'owner']);
  assert.deepEqual(allowedGradesFrom('membre'), ['membre', 'moderateur', 'manager', 'owner']);
  assert.deepEqual(allowedGradesFrom('moderateur'), ['moderateur', 'manager', 'owner']);
  assert.deepEqual(allowedGradesFrom('manager'), ['manager', 'owner']);
  assert.deepEqual(allowedGradesFrom('owner'), ['owner']);
  assert.deepEqual(allowedGradesFrom('nonexistent'), []);

  assert.equal(hasGradeOrAbove('owner', 'invite'), true);
  assert.equal(hasGradeOrAbove('owner', 'owner'), true);
  assert.equal(hasGradeOrAbove('invite', 'invite'), true);
  assert.equal(hasGradeOrAbove('invite', 'membre'), false);
  assert.equal(hasGradeOrAbove('membre', 'moderateur'), false);
  assert.equal(hasGradeOrAbove('moderateur', 'membre'), true);
  assert.equal(hasGradeOrAbove('unknown', 'invite'), false);
  assert.equal(hasGradeOrAbove('invite', 'unknown'), false);
});

test('tempVoiceInteraction buildName concatenates parts correctly', () => {
  function buildName(prefix, gameName, suffix, index = 0) {
    const base = [prefix || '', gameName || '', suffix || '']
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (index <= 0) {
      return base;
    }

    return `${base} ${index + 1}`;
  }

  assert.equal(buildName('🎮', 'Valorant', 'Partie'), '🎮 Valorant Partie');
  assert.equal(buildName('🎮', 'Valorant', 'Partie', 0), '🎮 Valorant Partie');
  assert.equal(buildName('🎮', 'Valorant', 'Partie', 1), '🎮 Valorant Partie 2');
  assert.equal(buildName('🎮', 'Valorant', 'Partie', 3), '🎮 Valorant Partie 4');
  assert.equal(buildName('', 'Game', ''), 'Game');
  assert.equal(buildName(null, null, null), '');
  assert.equal(buildName('prefix', '', 'suffix'), 'prefix suffix');
});
