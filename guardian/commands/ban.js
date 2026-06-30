const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre à ban').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Raison').setRequired(true)),
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

    await interaction.reply({ content: `${member.user.tag} a été banni.`, ephemeral: true });
  }
};
