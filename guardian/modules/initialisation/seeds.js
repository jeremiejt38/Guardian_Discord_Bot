const { CHANNEL_NAMES } = require('../../config');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../locales');
const { findGuildTextChannelByName } = require('../utils/channels');
const logger = require('../logs/logger');
const { seedSlowModePanel } = require('../moderation/slowModePanel');
const { seedBehaviorPanel } = require('../moderation/behaviorPanel');
const { seedReportPanel } = require('../moderation/reports');
const { seedMembresPanel } = require('../config/membresPanel');
const { seedChannelsPanel } = require('../config/channelsPanel');
const { seedVocauxPanel } = require('../config/vocauxPanel');
const { seedJeuxPanel } = require('../config/jeuxPanel');
const { seedChangelogsPanel } = require('../config/changelogsPanel');
const { seedServeursJeuPanel } = require('../config/serveursJeuPanel');
const { seedRolesPanel } = require('../config/rolesPanel');
const { seedStatusBotPanel } = require('../config/statusBotPanel');

async function seedGuildMessages(guild) {
  try {
    // Welcome message
    const welcome = findGuildTextChannelByName(guild, CHANNEL_NAMES.welcome);
    if (welcome && !welcome.lastMessageId) {
      await welcome.send(t('members.welcomePrompt', { member: guild.name }, { guildId: guild.id }));
    }

    // Game updates / changelogs
    const gameUpdates = findGuildTextChannelByName(guild, CHANNEL_NAMES.changelogs);
    if (gameUpdates && !gameUpdates.lastMessageId) {
      await gameUpdates.send(t('setup.gameUpdatesPlaceholder', {}, { guildId: guild.id }) || '🎮 MISES À JOUR DES JEUX\nCe channel affichera les changelogs des jeux suivis.');
    }

    // Suggestions forum placeholder
    const suggestions = findGuildTextChannelByName(guild, CHANNEL_NAMES.suggestions);
    if (suggestions && !suggestions.lastMessageId) {
      await suggestions.send(t('setup.suggestionsPlaceholder', {}, { guildId: guild.id }) || '💡 SUGGESTIONS & IDÉES\nProposez vos idées ici en créant un nouveau post !');
    }

    // Server list placeholder
    const serverList = findGuildTextChannelByName(guild, CHANNEL_NAMES.serverList);
    if (serverList && !serverList.lastMessageId) {
      await serverList.send(t('setup.serverListPlaceholder', {}, { guildId: guild.id }) || '🖥️ SERVEURS DE JEU DISPONIBLES\nAucun serveur configuré pour le moment.');
    }

    // Voice create seed button is handled by setup.createSetupArea when needed
    // Ensure creer-channel has a button to open the Create-Channel flow
    const voiceCreate = findGuildTextChannelByName(guild, CHANNEL_NAMES.voiceCreate);
    if (voiceCreate && !voiceCreate.lastMessageId) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('creer:open').setLabel(t('tempVoice.createButton', {}, { guildId: guild.id }) || 'Créer un vocal').setStyle(ButtonStyle.Primary)
      );
      await voiceCreate.send({ content: t('tempVoice.panelText', {}, { guildId: guild.id }) || 'Cliquez pour créer un vocal temporaire', components: [row] }).catch(() => undefined);
    }
    await seedSlowModePanel(guild);
    await seedBehaviorPanel(guild);
    await seedReportPanel(guild);
    await seedMembresPanel(guild);
    await seedChannelsPanel(guild);
    await seedVocauxPanel(guild);
    await seedJeuxPanel(guild);
    await seedChangelogsPanel(guild);
    await seedServeursJeuPanel(guild);
    await seedRolesPanel(guild);
    await seedStatusBotPanel(guild);
  } catch (error) {
    logger.error('Failed to seed guild messages', error);
  }
}

module.exports = { seedGuildMessages };
