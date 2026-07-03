const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../../database/db');
const { GRADE_NAMES, CHANNEL_NAMES } = require('../../config');
const { IDS } = require('./promotion');
const logger = require('../logs/logger');
const { t } = require('../../locales');

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

    const welcomeChannel = member.guild.channels.cache.find((channel) => channel.name === CHANNEL_NAMES.welcome);
    if (welcomeChannel?.isTextBased()) {
      const actions = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(IDS.request)
          .setStyle(ButtonStyle.Success)
          .setLabel(t('promotion.requestButton', {}, { guildId: member.guild.id }))
      );

      await welcomeChannel.send(
        {
          content: t('members.welcomePrompt', { member: String(member) }, { guildId: member.guild.id }),
          components: [actions]
        }
      );
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
