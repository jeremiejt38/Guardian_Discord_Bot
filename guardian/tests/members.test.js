const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';

const { canPromoteInvite } = require('../modules/members/newMember');

test('canPromoteInvite validates delay, bio and parrain constraints', () => {
  const now = new Date('2026-07-03T00:00:00.000Z');
  const olderJoin = new Date('2026-06-20T00:00:00.000Z').toISOString();
  const recentJoin = new Date('2026-07-02T00:00:00.000Z').toISOString();

  assert.equal(
    canPromoteInvite(
      { join_date: olderJoin, bio: 'Salut', parrain_id: 'p1' },
      { minDays: 7, bioRequired: true, parrainRequired: true, now }
    ),
    true
  );

  assert.equal(
    canPromoteInvite(
      { join_date: recentJoin, bio: 'Salut', parrain_id: 'p1' },
      { minDays: 7, bioRequired: true, parrainRequired: true, now }
    ),
    false
  );

  assert.equal(
    canPromoteInvite(
      { join_date: olderJoin, bio: '', parrain_id: 'p1' },
      { minDays: 7, bioRequired: true, parrainRequired: false, now }
    ),
    false
  );

  assert.equal(
    canPromoteInvite(
      { join_date: olderJoin, bio: 'ok', parrain_id: '' },
      { minDays: 7, bioRequired: false, parrainRequired: true, now }
    ),
    false
  );
});
