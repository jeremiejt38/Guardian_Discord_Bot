const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');
const { t, describe } = require('../modules/i18n');
const { replyEphemeral } = require('../modules/utils/interactions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription(describe('commands.warn.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription(describe('commands.warn.memberOption')).setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription(describe('commands.warn.reasonOption')).setRequired(true)),
  async execute(interaction) {
    const member = interaction.options.getUser('membre', true);
    const reason = interaction.options.getString('raison', true);

    saveSanction({
      guildId: interaction.guildId,
      userId: member.id,
      type: 'warn',
      reason,
      appliedBy: interaction.user.id,
      auto: 0
    });

    await replyEphemeral(
      interaction,
      t(interaction.guildId, 'commands.warn.success', { member: member.toString() })
    );
  }
};
