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

async function createTemporaryVoice(guild, name, userLimit = 0) {
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    userLimit
  });

  return channel;
}

module.exports = {
  trackTempVoice,
  untrackTempVoice,
  createTemporaryVoice
};
