const { getDb } = require('../../database/db');
const { GRADE_NAMES, CHANNELS } = require('../../config');
const logger = require('../logs/logger');

function getGradeRoleId(guildId, gradeName) {
  const db = getDb();
  const row = db.prepare('SELECT role_id FROM grades WHERE guild_id = ? AND grade_name = ?').get(guildId, gradeName);
  return row?.role_id;
}

async function handleNewMember(member) {
  try {
    const inviteRoleId = getGradeRoleId(member.guild.id, GRADE_NAMES.invite);
    if (inviteRoleId) {
      await member.roles.add(inviteRoleId);
    }

    const welcomeChannel = member.guild.channels.cache.find((channel) => channel.name === CHANNELS.welcome);
    if (welcomeChannel?.isTextBased()) {
      await welcomeChannel.send(`Bienvenue ${member} ! Clique sur le bouton de demande pour devenir membre.`);
    }

    const db = getDb();
    db.prepare(
      `INSERT INTO members (guild_id, user_id, grade, join_date)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id)
       DO UPDATE SET grade = excluded.grade, join_date = excluded.join_date`
    ).run(member.guild.id, member.id, GRADE_NAMES.invite, new Date().toISOString());
  } catch (error) {
    logger.error('Failed to process new member', error);
  }
}

module.exports = {
  handleNewMember
};
