const { markReportHandled } = require('../modules/moderation/reports');
const { handleHistoriquePagination } = require('../commands/historique');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return;
      }

      await command.execute(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'report:handled') {
      await markReportHandled(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('historique:')) {
      await handleHistoriquePagination(interaction);
      return;
    }

    if (interaction.isRepliable()) {
      await interaction.reply({ content: 'Interaction non prise en charge.', ephemeral: true });
    }
  }
};
