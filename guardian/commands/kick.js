const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre à kick').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Raison').setRequired(true)),
  async execute(interaction) {
    const member = interaction.options.getMember('membre', true);
    const reason = interaction.options.getString('raison', true);

    await member.kick(reason);

    saveSanction({
      guildId: interaction.guildId,
      userId: member.id,
      type: 'kick',
      reason,
      appliedBy: interaction.user.id,
      auto: 0
    });

    await interaction.reply({ content: `${member} a été expulsé.`, ephemeral: true });
  }
};
