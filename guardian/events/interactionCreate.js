const { markReportHandled } = require('../modules/moderation/reports');
const { handleHistoriquePagination } = require('../commands/historique');
const { handleOpenGameList, handleGameListSelection } = require('../modules/games/gameList');
const { t } = require('../modules/i18n');
const {
  SETUP_INSTALL_BUTTON_ID,
  SETUP_LANGUAGE_SELECT_ID,
  handleSetupInstallButton,
  handleSetupLanguageSelection
} = require('../modules/initialisation/setup');
const { handleAddServerButton, handleServerModalSubmit } = require('../modules/servers/interaction');

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

    if (interaction.isButton() && interaction.customId === 'gamelist:open') {
      await handleOpenGameList(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === SETUP_INSTALL_BUTTON_ID) {
      await handleSetupInstallButton(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'gamelist:select') {
      await handleGameListSelection(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === SETUP_LANGUAGE_SELECT_ID) {
      await handleSetupLanguageSelection(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'servers:add') {
      await handleAddServerButton(interaction);
      return;
    }

    if (interaction.isModalSubmit && interaction.customId === 'servers:add:modal') {
      await handleServerModalSubmit(interaction);
      return;
    }

    if (interaction.isRepliable()) {
      await interaction.reply({ content: t(interaction.guildId, 'interaction.unsupported'), ephemeral: true });
    }
  }
};
