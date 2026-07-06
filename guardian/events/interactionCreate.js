const { markReportHandled, handleOpenReportButton, handleReportModalSubmit } = require('../modules/moderation/reports');
const { handleSlowModeInteraction } = require('../modules/moderation/slowModePanel');
const { handleBehaviorInteraction } = require('../modules/moderation/behaviorPanel');
const { handleMembresInteraction } = require('../modules/config/membresPanel');
const { handleChannelsInteraction } = require('../modules/config/channelsPanel');
const { handleVocauxInteraction } = require('../modules/config/vocauxPanel');
const { handleJeuxInteraction } = require('../modules/config/jeuxPanel');
const { handleServeursJeuInteraction } = require('../modules/config/serveursJeuPanel');
const { handleRolesInteraction } = require('../modules/config/rolesPanel');
const { handleBotInteraction } = require('../modules/config/botPanel');
const { handleGuardianInteraction } = require('../modules/config/guardianPanel');
const { handleHistoriquePagination } = require('../commands/historique');
const { handleOpenGameList, handleGameListSelection } = require('../modules/games/gameList');
const { handleGamesInteraction } = require('../modules/games/optInInteraction');
const { handleServerGamesInteraction } = require('../modules/games/serverGamesManager');
const { handlePromotionInteraction, IDS: PROMOTION_IDS } = require('../modules/members/promotion');
const { t } = require('../modules/i18n');
const {
  SETUP_INSTALL_BUTTON_ID,
  SETUP_START_BUTTON_ID,
  SETUP_LANGUAGE_SELECT_ID,
  SETUP_INTEGRATE_BUTTON_ID,
  SETUP_RESET_BUTTON_ID,
  SETUP_FORCE_EXISTING_BUTTON_ID,
  SETUP_FORCE_REINSTALL_BUTTON_ID,
  handleSetupInstallButton,
  handleSetupIntegrateButton,
  handleSetupResetButton,
  handleSetupForceExistingButton,
  handleSetupForceReinstallButton,
  handleSetupLanguageSelection
} = require('../modules/initialisation/setup');
const { handleSetupInteraction, startWizardInChannel } = require('../modules/initialisation/setupFlow');
const { handleAddServerButton, handleServerModalSubmit, memberCanManageServers } = require('../modules/servers/interaction');
const { handleTempVoiceInteraction } = require('../modules/games/tempVoiceInteraction');
const { getDb } = require('../database/db');
const { decrypt } = require('../modules/crypto/secrets');
const { CHANNELS } = require('../config');
const { findGuildTextChannelByName } = require('../modules/utils/channels');
const { handleInteractionError } = require('../modules/utils/discordErrors');
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
    const AGE_LIMIT_MS = 3000;
    if (interaction.createdTimestamp && Date.now() - interaction.createdTimestamp > AGE_LIMIT_MS) {
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return;
      }

      await command.execute(interaction);
      return;
    }

    if (
      interaction.customId?.startsWith('tempvoice:') ||
      interaction.customId === 'init.createChannel' ||
      interaction.customId === 'creer:open'
    ) {
      const handled = await handleTempVoiceInteraction(interaction);
      if (handled) return;
    }

    if (interaction.customId?.startsWith('automod:slowmode:')) {
      const handled = await handleSlowModeInteraction(interaction);
      if (handled) return;
    }

    if (interaction.customId?.startsWith('behavior:')) {
      const handled = await handleBehaviorInteraction(interaction);
      if (handled) return;
    }

    if (interaction.customId?.startsWith('membres:')) {
      const handled = await handleMembresInteraction(interaction);
      if (handled) return;
    }

    if (interaction.customId?.startsWith('channels:toggle:')) {
      const handled = await handleChannelsInteraction(interaction);
      if (handled) return;
    }

    if (interaction.customId?.startsWith('vocaux:')) {
      const handled = await handleVocauxInteraction(interaction);
      if (handled) return;
    }

    if (interaction.customId?.startsWith('jeux:')) {
      const handled = await handleJeuxInteraction(interaction);
      if (handled) return;
    }

    if (interaction.customId?.startsWith('changelogs:')) {
      const handled = await handleJeuxInteraction(interaction);
      if (handled) return;
    }

    if (
      interaction.customId?.startsWith('serveurs-jeu:') ||
      interaction.customId?.startsWith('servers:approve:') ||
      interaction.customId?.startsWith('servers:reject:')
    ) {
      const handled = await handleServeursJeuInteraction(interaction);
      if (handled) return;
    }

    if (interaction.customId?.startsWith('roles:')) {
      const handled = await handleRolesInteraction(interaction);
      if (handled) return;
    }

    if (interaction.customId?.startsWith('bot:')) {
      const handled = await handleBotInteraction(interaction);
      if (handled) return;
    }

    if (interaction.customId?.startsWith('guardian:')) {
      const handled = await handleGuardianInteraction(interaction);
      if (handled) return;
    }

    if (interaction.isButton() && interaction.customId === 'report:open') {
      await handleOpenReportButton(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'report:modal') {
      await handleReportModalSubmit(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('report:handled')) {
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

    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
      if (
        interaction.customId === PROMOTION_IDS.request ||
        interaction.customId === PROMOTION_IDS.submitBioModal ||
        interaction.customId.startsWith(`${PROMOTION_IDS.acceptPrefix}:`) ||
        interaction.customId.startsWith(`${PROMOTION_IDS.rejectPrefix}:`) ||
        interaction.customId.startsWith(`${PROMOTION_IDS.replyPrefix}:`) ||
        interaction.customId.startsWith(`${PROMOTION_IDS.rejectReasonModalPrefix}:`) ||
        interaction.customId.startsWith(`${PROMOTION_IDS.replyMessageModalPrefix}:`)
      ) {
        const handled = await handlePromotionInteraction(interaction);
        if (handled) return;
      }
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      if (interaction.customId === 'games:manage' || interaction.customId === 'games:select') {
        const handled = await handleGamesInteraction(interaction);
        if (handled) return;
      }
    }

    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
      if (
        interaction.customId === 'servergames:add' ||
        interaction.customId === 'servergames:remove' ||
        interaction.customId === 'servergames:add:modal' ||
        interaction.customId === 'servergames:remove:select'
      ) {
        const handled = await handleServerGamesInteraction(interaction);
        if (handled) return;
      }
    }

    if (interaction.isButton() && interaction.customId === SETUP_INSTALL_BUTTON_ID) {
      await handleSetupInstallButton(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === SETUP_START_BUTTON_ID) {
      await startWizardInChannel(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === SETUP_INTEGRATE_BUTTON_ID) {
      await handleSetupIntegrateButton(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === SETUP_RESET_BUTTON_ID) {
      await handleSetupResetButton(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === SETUP_FORCE_EXISTING_BUTTON_ID) {
      await handleSetupForceExistingButton(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId === SETUP_FORCE_REINSTALL_BUTTON_ID) {
      await handleSetupForceReinstallButton(interaction);
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

    if (
      typeof interaction.customId === 'string'
      && interaction.customId.startsWith('setup:')
      && interaction.customId !== SETUP_INSTALL_BUTTON_ID
      && interaction.customId !== SETUP_LANGUAGE_SELECT_ID
    ) {
      const handled = await handleSetupInteraction(interaction);
      if (handled) {
        return;
      }
    }

    if (interaction.isButton() && interaction.customId === 'servers:add') {
      await handleAddServerButton(interaction);
      return;
    }


    if (interaction.isModalSubmit() && interaction.customId === 'servers:add:modal') {
      await handleServerModalSubmit(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('servers:approve:')) {
      if (!memberCanManageServers(interaction)) {
        await interaction.reply({ content: t(interaction.guildId, 'interaction.forbidden'), ephemeral: true });
        return;
      }
      const parts = interaction.customId.split(':');
      const serverId = Number(parts[2]);
      const db = getDb();
      db.prepare('UPDATE servers_jeu SET approved = 1 WHERE server_id = ?').run(serverId);

      const row = db.prepare('SELECT name, game, ip, port, password FROM servers_jeu WHERE server_id = ?').get(serverId);
      const channel = findGuildTextChannelByName(interaction.guild, CHANNELS.serverList);
      if (channel) {
        const embed = {
          title: `Serveur ajouté: ${row.name}`,
          fields: [
            { name: 'Jeu', value: String(row.game), inline: true },
            { name: 'IP:Port', value: `${row.ip}:${row.port}`, inline: true }
          ]
        };
        if (row.password) {
          let pwd = row.password;
          try {
            pwd = decrypt(row.password);
          } catch (e) {}
          embed.fields.push({ name: 'Mot de passe', value: String(pwd), inline: true });
        }
        await channel.send({ embeds: [embed] });
      }

      await interaction.update({ content: t(interaction.guildId, 'servers.approved', { user: interaction.user.tag }), components: [] });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('servers:reject:')) {
      if (!memberCanManageServers(interaction)) {
        await interaction.reply({ content: t(interaction.guildId, 'interaction.forbidden'), ephemeral: true });
        return;
      }
      const parts = interaction.customId.split(':');
      const serverId = Number(parts[2]);
      const db = getDb();
      db.prepare('DELETE FROM servers_jeu WHERE server_id = ?').run(serverId);
      await interaction.update({ content: t(interaction.guildId, 'servers.rejected', { user: interaction.user.tag }), components: [] });
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('servers:connect:')) {
      if (!memberCanManageServers(interaction)) {
        await interaction.reply({ content: t(interaction.guildId, 'interaction.forbidden'), ephemeral: true });
        return;
      }
      const parts = interaction.customId.split(':');
      const serverId = Number(parts[2]);
      const db = getDb();
      const row = db.prepare('SELECT ip, port, password FROM servers_jeu WHERE server_id = ?').get(serverId);
      if (!row) {
        await interaction.reply({ content: t(interaction.guildId, 'servers.notFound'), ephemeral: true });
        return;
      }
      let pwd = row.password;
      try {
        pwd = decrypt(row.password);
      } catch (e) {}
      await interaction.reply({ content: t(interaction.guildId, 'servers.connectInfo', { ip: row.ip, port: String(row.port), pwd: pwd || '' }), ephemeral: true });
      return;
    }

    if (interaction.isRepliable()) {
      await interaction.reply({ content: t(interaction.guildId, 'interaction.unsupported'), ephemeral: true });
    }
    } catch (err) {
      const handled = await handleInteractionError(interaction, err, `interactionCreate:${interaction.customId ?? interaction.commandName ?? 'unknown'}`);
      if (!handled) {
        logger.error('Unhandled interaction error', { message: err?.message, stack: err?.stack, customId: interaction.customId });
      }
    }
  }
};
