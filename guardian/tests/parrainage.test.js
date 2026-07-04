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

test('parrainage module saves and retrieves sponsorships', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';
  const tempDbPath = path.join(os.tmpdir(), `guardian-${Date.now()}-${Math.random()}.db`);

  const { initDatabase, getDb } = freshModule('../database/db');
  initDatabase(tempDbPath);

  const { saveSponsorship, getSponsorship } = freshModule('../modules/members/parrainage');

  assert.equal(getSponsorship('g1', 'invite1'), undefined);

  saveSponsorship('g1', 'parrain1', 'invite1');

  const result = getSponsorship('g1', 'invite1');
  assert.equal(result.guild_id, 'g1');
  assert.equal(result.parrain_id, 'parrain1');
  assert.equal(result.invite_id, 'invite1');
  assert.ok(result.date);

  saveSponsorship('g1', 'parrain2', 'invite1');
  const updated = getSponsorship('g1', 'invite1');
  assert.equal(updated.parrain_id, 'parrain2');

  saveSponsorship('g1', 'parrain3', 'invite2');
  assert.equal(getSponsorship('g1', 'invite2').parrain_id, 'parrain3');
  assert.equal(getSponsorship('g1', 'invite1').parrain_id, 'parrain2');

  assert.equal(getSponsorship('g2', 'invite1'), undefined);

  getDb().close();
  fs.rmSync(tempDbPath, { force: true });
});
