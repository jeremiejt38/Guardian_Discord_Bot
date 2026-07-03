const { ChannelType } = require('discord.js');
const { getDb } = require('../../database/db');

function trackTempVoice(channelId, guildId, gameId, createdBy) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO vocal_temp (channel_id, guild_id, game_id, created_by, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(channelId, guildId, gameId, createdBy, new Date().toISOString());
}

function untrackTempVoice(channelId) {
  const db = getDb();
  db.prepare('DELETE FROM vocal_temp WHERE channel_id = ?').run(channelId);
}

async function createTemporaryVoice(guild, name, userLimit = 0, parentId = null) {
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    userLimit,
    parent: parentId || undefined
  });

  return channel;
}

async function cleanupStaleTempVoices(client) {
  const db = getDb();
  const rows = db.prepare('SELECT channel_id, guild_id FROM vocal_temp').all();

  for (const row of rows) {
    const guild = await client.guilds.fetch(row.guild_id).catch(() => null);
    if (!guild) {
      untrackTempVoice(row.channel_id);
      continue;
    }

    const channel = await guild.channels.fetch(row.channel_id).catch(() => null);
    if (!channel || !channel.isVoiceBased()) {
      untrackTempVoice(row.channel_id);
      continue;
    }

    if (channel.members.size === 0) {
      await channel.delete('Guardian: stale temporary channel cleanup').catch(() => undefined);
      untrackTempVoice(row.channel_id);
    }
  }
}

module.exports = {
  trackTempVoice,
  untrackTempVoice,
  createTemporaryVoice,
  cleanupStaleTempVoices
};
