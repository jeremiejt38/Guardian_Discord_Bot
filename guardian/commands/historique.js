const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getSanctionsHistory } = require('../modules/moderation/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historique')
    .setDescription('Historique des sanctions d\'un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre ciblé').setRequired(true)),
  async execute(interaction) {
    const member = interaction.options.getUser('membre', true);
    const history = getSanctionsHistory(interaction.guildId, member.id);

    const embed = new EmbedBuilder()
      .setTitle(`Historique — ${member.tag}`)
      .setDescription(
        history.length
          ? history.map((entry) => `• ${entry.type} — ${entry.reason} (${entry.timestamp})`).join('\n')
          : 'Aucune sanction.'
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
