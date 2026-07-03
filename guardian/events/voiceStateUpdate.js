const { getDb } = require('../database/db');
const { untrackTempVoice } = require('../modules/games/gamesVocal');
const { getGuildSetting } = require('../modules/config/settings');

const deletionTimers = new Map();

function scheduleDeletion(channel, delayMs) {
  clearTimeout(deletionTimers.get(channel.id));
  const timer = setTimeout(async () => {
    if (channel.members.size === 0) {
      await channel.delete('Guardian: temporary channel cleanup').catch(() => undefined);
      untrackTempVoice(channel.id);
    }
    deletionTimers.delete(channel.id);
  }, delayMs);

  deletionTimers.set(channel.id, timer);
}

module.exports = {
  name: 'voiceStateUpdate',
  async execute(client, oldState, newState) {
    const db = getDb();

    for (const state of [oldState, newState]) {
      const channel = state.channel;
      if (!channel) {
        continue;
      }

      const tracked = db.prepare('SELECT channel_id FROM vocal_temp WHERE channel_id = ?').get(channel.id);
      if (!tracked) {
        continue;
      }

      if (channel.members.size === 0) {
        const delayMinutes = Math.max(1, Number(getGuildSetting(channel.guild.id, 'vocaux', 'empty_delete_minutes', 5)));
        scheduleDeletion(channel, delayMinutes * 60 * 1000);
      } else if (deletionTimers.has(channel.id)) {
        clearTimeout(deletionTimers.get(channel.id));
        deletionTimers.delete(channel.id);
      }
    }
  }
};
