const { test } = require('node:test');
const assert = require('node:assert');

process.env.DATABASE_PATH = ':memory:';
const { initDatabase } = require('../database/db');
initDatabase();

const setupResume = require('../commands/setupResume');

test('setupResume command data has correct name', () => {
  assert.strictEqual(setupResume.data.name, 'setup-resume');
});

test('execute blocks bot admin', async () => {
  process.env.BOT_ADMIN_ID = 'admin123';
  const replies = [];
  const interaction = {
    user: { id: 'admin123' },
    guildId: 'guild123',
    guild: { id: 'guild123' },
    member: {
      permissions: { has: () => true },
    },
    reply: async (msg) => replies.push(msg),
    deferReply: async () => {},
    editReply: async (msg) => replies.push(msg),
    channel: { send: async () => {} },
  };
  await setupResume.execute(interaction);
  assert.strictEqual(replies.length, 1);
  assert.ok(replies[0].content.includes('bot admin'));
});

test('execute blocks user without ManageGuild', async () => {
  process.env.BOT_ADMIN_ID = 'admin123';
  const replies = [];
  const interaction = {
    user: { id: 'user456' },
    guildId: 'guild123',
    guild: { id: 'guild123' },
    member: {
      permissions: { has: (p) => false },
    },
    reply: async (msg) => replies.push(msg),
    deferReply: async () => {},
    editReply: async (msg) => replies.push(msg),
    channel: { send: async () => {} },
  };
  await setupResume.execute(interaction);
  assert.strictEqual(replies.length, 1);
  assert.ok(replies[0].content.includes('permission'));
});
