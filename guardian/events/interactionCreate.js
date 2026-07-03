const { handleReportInteraction } = require('../modules/moderation/reports');
const { handleSetupInteraction } = require('../modules/initialisation/setupFlow');
const { handlePromotionInteraction } = require('../modules/members/promotion');
const { handleGamesInteraction } = require('../modules/games/optInInteraction');
const { handleServerGamesInteraction } = require('../modules/games/serverGamesManager');
const { handleTempVoiceInteraction } = require('../modules/games/tempVoiceInteraction');
const { handleSettingsInteraction } = require('../modules/config/settings');
const { t } = require('../locales');
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          return;
        }

        await command.execute(interaction);
        return;
      }

      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        const handledSetup = await handleSetupInteraction(interaction);
        if (handledSetup) {
          return;
        }

        const handledPromotion = await handlePromotionInteraction(interaction);
        if (handledPromotion) {
          return;
        }

        const handledGames = await handleGamesInteraction(interaction);
        if (handledGames) {
          return;
        }

        const handledServerGames = await handleServerGamesInteraction(interaction);
        if (handledServerGames) {
          return;
        }

        const handledTempVoice = await handleTempVoiceInteraction(interaction);
        if (handledTempVoice) {
          return;
        }

        const handledReport = await handleReportInteraction(interaction);
        if (handledReport) {
          return;
        }

        const handledSettings = await handleSettingsInteraction(interaction);
        if (handledSettings) {
          return;
        }
      }

      if (interaction.isModalSubmit()) {
        const handledPromotionModal = await handlePromotionInteraction(interaction);
        if (handledPromotionModal) {
          return;
        }

        const handledServerGamesModal = await handleServerGamesInteraction(interaction);
        if (handledServerGamesModal) {
          return;
        }

        const handledReportModal = await handleReportInteraction(interaction);
        if (handledReportModal) {
          return;
        }
      }

      if (interaction.isRepliable()) {
        await interaction.reply({
          content: t('interaction.unsupported', {}, { guildId: interaction.guildId }),
          ephemeral: true
        });
      }
    } catch (error) {
      logger.error('interactionCreate failed', error);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: t('interaction.internalError', {}, { guildId: interaction.guildId }),
          ephemeral: true
        }).catch(() => undefined);
      }
    }
  }
};
