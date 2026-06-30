const { getDb } = require('../../database/db');
const logger = require('../logs/logger');

const DAY_MS = 24 * 60 * 60 * 1000;

function startInviteExpulsionJob(client, intervalMs = DAY_MS) {
  return setInterval(async () => {
    const db = getDb();
    const rows = db.prepare("SELECT guild_id, user_id, join_date FROM members WHERE grade = 'invite'").all();

    for (const row of rows) {
      try {
        const maxDays = 30;
        const joinedAt = new Date(row.join_date).getTime();
        if (!joinedAt || Date.now() - joinedAt < maxDays * DAY_MS) {
          continue;
        }

        const guild = await client.guilds.fetch(row.guild_id);
        const member = await guild.members.fetch(row.user_id).catch(() => null);
        if (member) {
          await member.kick('Guardian: délai de promotion dépassé');
          await logger.logToDiscord(guild, `Expulsion automatique: <@${row.user_id}> (délai dépassé)`);
        }
      } catch (error) {
        logger.error('Failed invite expulsion cycle item', error);
      }
    }
  }, intervalMs);
}

module.exports = {
  startInviteExpulsionJob
};
