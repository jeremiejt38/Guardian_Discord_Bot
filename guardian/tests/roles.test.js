const test = require('node:test');
const assert = require('node:assert/strict');

const { memberHasAnyRole } = require('../modules/utils/roles');

function makeMember(roleIds) {
  return { roles: { cache: new Set(roleIds) } };
}

test('memberHasAnyRole returns true when the member holds any listed role', () => {
  const member = makeMember(['r2']);

  assert.equal(memberHasAnyRole(member, ['r1', 'r2', 'r3']), true);
  assert.equal(memberHasAnyRole(member, ['r1', 'r3']), false);
});

test('memberHasAnyRole ignores falsy role ids', () => {
  const member = makeMember(['r1']);

  assert.equal(memberHasAnyRole(member, [null, undefined, '']), false);
  assert.equal(memberHasAnyRole(member, [null, 'r1']), true);
});

test('memberHasAnyRole is safe with missing member/roles or non-array input', () => {
  assert.equal(memberHasAnyRole(undefined, ['r1']), false);
  assert.equal(memberHasAnyRole({}, ['r1']), false);
  assert.equal(memberHasAnyRole({ roles: {} }, ['r1']), false);
  assert.equal(memberHasAnyRole(makeMember(['r1']), 'r1'), false);
  assert.equal(memberHasAnyRole(makeMember(['r1']), []), false);
});
