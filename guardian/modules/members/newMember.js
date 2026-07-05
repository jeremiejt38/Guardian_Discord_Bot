const { getDb } = require('../../database/db');
const { GRADE_NAMES, CHANNELS } = require('../../config');
const { t } = require('../i18n');
const logger = require('../logs/logger');
const { buildRequestButton } = require('./promotionRequest');

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
      await welcomeChannel.send({
        content: t(member.guild.id, 'members.welcome', { member: member.toString() }),
        components: [buildRequestButton(member.guild.id)]
      });
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

function canPromoteInvite(record, options = {}) {
  const {
    minDays = 0,
    bioRequired = false,
    parrainRequired = false,
    now = new Date()
  } = options;

  if (!record?.join_date) {
    return false;
  }

  const joinDate = new Date(record.join_date);
  if (Number.isNaN(joinDate.getTime())) {
    return false;
  }

  const ageMs = now.getTime() - joinDate.getTime();
  const minAgeMs = minDays * 24 * 60 * 60 * 1000;
  if (ageMs < minAgeMs) {
    return false;
  }

  if (bioRequired && !String(record.bio || '').trim()) {
    return false;
  }

  if (parrainRequired && !String(record.parrain_id || '').trim()) {
    return false;
  }

  return true;
}

module.exports = {
  handleNewMember,
  canPromoteInvite
};
