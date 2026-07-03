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
    const user = interaction.options.getUser('membre', true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const reason = interaction.options.getString('raison', true);

    await saveSanction({
      guildId: interaction.guildId,
      userId: user.id,
      type: 'warn',
      reason,
      appliedBy: interaction.user.id,
      auto: 0,
      guild: interaction.guild,
      member
    });

    await user.send(`Tu as reçu un avertissement: ${reason}`).catch(() => undefined);

    await interaction.reply({ content: `Warn enregistré pour ${user}.`, ephemeral: true });
  }
};
