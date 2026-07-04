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

test('gradeMapping module persists and retrieves grade-role mappings', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase, getDb } = freshModule('../database/db');
  initDatabase(tempDbPath);

  const { setGradeRole, getGradeMappings, ORDERED_GRADES } = freshModule('../modules/initialisation/gradeMapping');

  assert.ok(Array.isArray(ORDERED_GRADES));
  assert.equal(ORDERED_GRADES.length, 5);
  assert.ok(ORDERED_GRADES.includes('invite'));
  assert.ok(ORDERED_GRADES.includes('owner'));

  let mappings = getGradeMappings('g1');
  assert.deepEqual(mappings, {});

  setGradeRole('g1', 'invite', 'role-invite');
  setGradeRole('g1', 'membre', 'role-membre');
  setGradeRole('g1', 'moderateur', 'role-mod');

  mappings = getGradeMappings('g1');
  assert.equal(mappings.invite, 'role-invite');
  assert.equal(mappings.membre, 'role-membre');
  assert.equal(mappings.moderateur, 'role-mod');

  setGradeRole('g1', 'invite', 'role-invite-updated');
  mappings = getGradeMappings('g1');
  assert.equal(mappings.invite, 'role-invite-updated');

  const otherMappings = getGradeMappings('g2');
  assert.deepEqual(otherMappings, {});

  getDb().close();
  fs.rmSync(tempDbPath, { force: true });
});
