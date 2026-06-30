const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre à mute').setRequired(true))
    .addStringOption((option) => option.setName('duree').setDescription('Durée ex: 1h').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Raison').setRequired(true)),
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

    await interaction.reply({ content: `Mute enregistré pour ${member}.`, ephemeral: true });
  }
};
