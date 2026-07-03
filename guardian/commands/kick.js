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

    await interaction.reply({ content: `${member} a été expulsé.`, ephemeral: true });
  }
};
