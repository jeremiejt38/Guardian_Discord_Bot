const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../database/db');
const { setGuildSetting } = require('../modules/config/settings');
const { sendModLog } = require('../modules/moderation/modLog');

function buildFakeGuild({ id = 'guild-1', channels = {} } = {}) {
  return {
    id,
    channels: {
      cache: {
        get: (channelId) => channels[channelId] || null
      }
    }
  };
}

test('sendModLog: silencieux si mod_logs_enabled est false', async () => {
  initDatabase(':memory:');
  const sent = [];
  const guild = buildFakeGuild({
    channels: { 'chan-1': { send: async (msg) => sent.push(msg) } }
  });
  setGuildSetting('guild-1', 'modules', 'mod_logs_enabled', false);
  setGuildSetting('guild-1', 'channels', 'moderation_logs_channel_id', 'chan-1');

  await sendModLog(guild, 'test message');
  assert.strictEqual(sent.length, 0, 'Aucun message ne doit être envoyé si désactivé');
});

test('sendModLog: envoie dans le bon channel si activé', async () => {
  initDatabase(':memory:');
  const sent = [];
  const guild = buildFakeGuild({
    channels: { 'chan-2': { send: async (msg) => sent.push(msg) } }
  });
  setGuildSetting('guild-2', 'modules', 'mod_logs_enabled', true);
  setGuildSetting('guild-2', 'channels', 'moderation_logs_channel_id', 'chan-2');
  guild.id = 'guild-2';

  await sendModLog(guild, 'sanction test');
  assert.strictEqual(sent.length, 1, 'Un message doit être envoyé');
  assert.strictEqual(sent[0].content, 'sanction test');
});

test('sendModLog: silencieux si channel introuvable', async () => {
  initDatabase(':memory:');
  const guild = buildFakeGuild({ channels: {} });
  setGuildSetting('guild-3', 'modules', 'mod_logs_enabled', true);
  setGuildSetting('guild-3', 'channels', 'moderation_logs_channel_id', 'chan-missing');
  guild.id = 'guild-3';

  await assert.doesNotReject(() => sendModLog(guild, 'test'), 'Ne doit pas rejeter si channel manquant');
});

test('sendModLog: silencieux si guild est null', async () => {
  await assert.doesNotReject(() => sendModLog(null, 'test'), 'Ne doit pas rejeter si guild null');
});
