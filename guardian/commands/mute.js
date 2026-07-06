const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');
const { sendModLog } = require('../modules/moderation/modLog');
const { t, describe } = require('../modules/i18n');
const { replyEphemeral } = require('../modules/utils/interactions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription(describe('commands.mute.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription(describe('commands.mute.memberOption')).setRequired(true))
    .addStringOption((option) => option.setName('duree').setDescription(describe('commands.mute.durationOption')).setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription(describe('commands.mute.reasonOption')).setRequired(true)),
  async execute(interaction) {
    const member = interaction.options.getMember('membre', true);
    const reason = interaction.options.getString('raison', true);
    const duration = interaction.options.getString('duree', true);

    saveSanction({
      guildId: interaction.guildId,
      userId: member.id,
      type: 'mute',
      reason,
      duration,
      appliedBy: interaction.user.id,
      auto: 0
    });

    await sendModLog(interaction.guild, t(interaction.guildId, 'modLog.sanctionLog', { type: 'mute', userId: member.id, appliedBy: interaction.user.id, reason }));

    await replyEphemeral(
      interaction,
      t(interaction.guildId, 'commands.mute.success', { member: member.toString() })
    );
  }
};
