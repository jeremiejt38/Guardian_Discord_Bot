const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertir un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre à avertir').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Raison').setRequired(true)),
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

    await interaction.reply({ content: `Warn enregistré pour ${member}.`, ephemeral: true });
  }
};
