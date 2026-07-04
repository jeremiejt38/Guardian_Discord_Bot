const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');
const { DEFAULT_LANGUAGE, t, tForLanguage } = require('../modules/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.ban.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) => option.setName('membre').setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.ban.memberOption')).setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.ban.reasonOption')).setRequired(true)),
  async execute(interaction) {
    const member = interaction.options.getMember('membre', true);
    const reason = interaction.options.getString('raison', true);

    await member.ban({ reason });

    saveSanction({
      guildId: interaction.guildId,
      userId: member.id,
      type: 'ban',
      reason,
      appliedBy: interaction.user.id,
      auto: 0
    });

    await interaction.reply({
      content: t(interaction.guildId, 'commands.ban.success', { memberTag: member.user.tag }),
      ephemeral: true
    });
  }
};
