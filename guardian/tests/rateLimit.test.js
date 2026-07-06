const test = require('node:test');
const assert = require('node:assert/strict');
const { checkRateLimit, getDelay, RATE_FAMILIES } = require('../modules/utils/rateLimit');

test('premier clic toujours autorisé', () => {
  const blocked = checkRateLimit('user-rl-1', 'setup:step:next');
  assert.strictEqual(blocked, false);
});

test('double clic immédiat bloqué', () => {
  const userId = 'user-rl-2';
  checkRateLimit(userId, 'setup:finalize');
  const blocked = checkRateLimit(userId, 'setup:finalize');
  assert.strictEqual(blocked, true);
});

test('deux utilisateurs différents ne se bloquent pas mutuellement', () => {
  checkRateLimit('user-rl-3a', 'setup:step:next');
  const blocked = checkRateLimit('user-rl-3b', 'setup:step:next');
  assert.strictEqual(blocked, false);
});

test('même utilisateur, customId différent — non bloqué', () => {
  const userId = 'user-rl-4';
  checkRateLimit(userId, 'setup:step:next');
  const blocked = checkRateLimit(userId, 'setup:games:page:next');
  assert.strictEqual(blocked, false);
});

test('getDelay retourne le bon délai par famille', () => {
  assert.strictEqual(getDelay('setup:finalize'), 5000);
  assert.strictEqual(getDelay('setup:step:next'), 2000);
  assert.strictEqual(getDelay('setup:channel:skip:next'), 1500);
  assert.strictEqual(getDelay('setup:games:page:prev'), 600);
  assert.strictEqual(getDelay('setup:grade:role:invite'), 1000);
  assert.strictEqual(getDelay('setup:newoptions:next'), 2000);
  assert.strictEqual(getDelay('setup:something:unknown'), 800);
  assert.strictEqual(getDelay('totally:unrelated'), 800);
});

test('RATE_FAMILIES est bien défini et trié par spécificité (plus long en premier)', () => {
  assert.ok(Array.isArray(RATE_FAMILIES));
  assert.ok(RATE_FAMILIES.length > 0);
  for (const entry of RATE_FAMILIES) {
    assert.ok(typeof entry.prefix === 'string');
    assert.ok(typeof entry.delay === 'number' && entry.delay > 0);
  }
  const finalize = RATE_FAMILIES.find((f) => f.prefix === 'setup:finalize');
  const generic = RATE_FAMILIES.find((f) => f.prefix === 'setup:');
  assert.ok(RATE_FAMILIES.indexOf(finalize) < RATE_FAMILIES.indexOf(generic), 'finalize doit être avant setup: générique');
});

test('après le délai écoulé, le même clic est autorisé', async () => {
  const userId = 'user-rl-6';
  const customId = 'setup:games:page:next';
  checkRateLimit(userId, customId);
  await new Promise((r) => setTimeout(r, getDelay(customId) + 50));
  const blocked = checkRateLimit(userId, customId);
  assert.strictEqual(blocked, false, 'Doit être autorisé après le délai');
});
