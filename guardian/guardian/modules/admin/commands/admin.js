const { SlashCommandBuilder } = require('discord.js');
const { buildMainView, buildStatsView, buildModerationView, buildGamesView, buildRecapView, VIEWS } = require('../adminPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Commande d\'administration Guardian'),
  async execute(interaction) {
    // Vérification des permissions
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: 'Vous n\'avez pas la permission d\'utiliser cette commande.', ephemeral: true });
    }

    const view = buildMainView();
    await interaction.reply(view);
  },
  async handleInteraction(interaction) {
    // Vérification des permissions
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: 'Vous n\'avez pas la permission d\'utiliser cette commande.', ephemeral: true });
    }

    if (interaction.customId === 'admin_back') {
      const view = buildMainView();
      await interaction.update(view);
    } else if (interaction.customId === 'admin_stats') {
      const view = buildStatsView();
      await interaction.update(view);
    } else if (interaction.customId === 'admin_moderation') {
      const view = buildModerationView();
      await interaction.update(view);
    } else if (interaction.customId === 'admin_games') {
      const view = buildGamesView();
      await interaction.update(view);
    } else if (interaction.customId === 'admin_recap') {
      const view = await buildRecapView();
      await interaction.update(view);
    }
  }
};
