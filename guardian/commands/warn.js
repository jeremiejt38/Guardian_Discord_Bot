const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');
const { DEFAULT_LANGUAGE, t, tForLanguage } = require('../modules/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.warn.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.warn.memberOption')).setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.warn.reasonOption')).setRequired(true)),
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

    await interaction.reply({
      content: t(interaction.guildId, 'commands.warn.success', { member: member.toString() }),
      ephemeral: true
    });
  }
};
