const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');
const { DEFAULT_LANGUAGE, t, tForLanguage } = require('../modules/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.mute.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.mute.memberOption')).setRequired(true))
    .addStringOption((option) => option.setName('duree').setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.mute.durationOption')).setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.mute.reasonOption')).setRequired(true)),
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

    await interaction.reply({
      content: t(interaction.guildId, 'commands.mute.success', { member: member.toString() }),
      ephemeral: true
    });
  }
};
