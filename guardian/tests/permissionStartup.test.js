const { test } = require('node:test');
const assert = require('node:assert');
process.env.BOT_ADMIN_ID = 'admin123';
const { checkMissingPermissions, getMissingPermissions } = require('../modules/admin/permissionStartupCheck');

function makeGuild(perms = []) {
  return {
    id: '123',
    name: 'Test Guild',
    members: {
      me: {
        permissions: {
          has: (p) => perms.includes(p),
        },
      },
    },
  };
}

test('getMissingPermissions returns empty when all permissions present', () => {
  const guild = makeGuild(['ManageChannels', 'ManageRoles']);
  assert.deepStrictEqual(getMissingPermissions(guild), []);
});

test('getMissingPermissions returns missing permissions', () => {
  const guild = makeGuild(['ManageChannels']);
  assert.deepStrictEqual(getMissingPermissions(guild), ['ManageRoles']);
});

test('checkMissingPermissions sends DM for missing permissions', async () => {
  const dms = [];
  const client = {
    user: { id: 'bot' },
    guilds: {
      cache: new Map([['123', makeGuild(['ManageChannels'])]]),
    },
    users: {
      fetch: async (id) => ({
        id,
        send: async (msg) => dms.push({ id, msg }),
      }),
    },
  };
  await checkMissingPermissions(client);
  assert.strictEqual(dms.length, 1);
  assert.ok(dms[0].msg.includes('ManageRoles'));
});

test('checkMissingPermissions does nothing when all permissions present', async () => {
  const dms = [];
  const client = {
    user: { id: 'bot' },
    guilds: {
      cache: new Map([['123', makeGuild(['ManageChannels', 'ManageRoles'])]]),
    },
    users: {
      fetch: async (id) => ({
        id,
        send: async (msg) => dms.push({ id, msg }),
      }),
    },
  };
  await checkMissingPermissions(client);
  assert.strictEqual(dms.length, 0);
});
