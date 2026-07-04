const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');
const { DEFAULT_LANGUAGE, t, tForLanguage } = require('../modules/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.kick.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) => option.setName('membre').setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.kick.memberOption')).setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.kick.reasonOption')).setRequired(true)),
  async execute(interaction) {
    const member = interaction.options.getMember('membre', true);
    const reason = interaction.options.getString('raison', true);

    await member.send(`Tu as été expulsé du serveur. Raison: ${reason}`).catch(() => undefined);

    await member.kick(reason);

    await saveSanction({
      guildId: interaction.guildId,
      userId: member.id,
      type: 'kick',
      reason,
      appliedBy: interaction.user.id,
      auto: 0,
      guild: interaction.guild,
      member
    });

    await interaction.reply({
      content: t(interaction.guildId, 'commands.kick.success', { member: member.toString() }),
      ephemeral: true
    });
  }
};
