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

    await member.send(`Tu as été banni du serveur. Raison: ${reason}`).catch(() => undefined);

    await member.ban({ reason });

    await saveSanction({
      guildId: interaction.guildId,
      userId: member.id,
      type: 'ban',
      reason,
      appliedBy: interaction.user.id,
      auto: 0,
      guild: interaction.guild,
      member
    });

    await interaction.reply({ content: `${member.user.tag} a été banni.`, ephemeral: true });
  }
};
