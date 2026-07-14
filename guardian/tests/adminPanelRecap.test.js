const { test } = require('node:test');
const assert = require('node:assert');
const { getRecapStats } = require('../modules/admin/recapStats');

test('getRecapStats returns object with expected keys', () => {
  const stats = getRecapStats();
  assert.strictEqual(typeof stats.newMemberCount, 'number');
  assert.strictEqual(typeof stats.activeGameCount, 'number');
  assert.strictEqual(typeof stats.moderationIncidentCount, 'number');
  assert.strictEqual(stats.days, 30);
});
