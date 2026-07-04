const { CHANNEL_NAMES } = require('../../config');
const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../locales');
const logger = require('../logs/logger');

async function seedGuildMessages(guild) {
  try {
    // Welcome message
    const welcome = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === CHANNEL_NAMES.welcome);
    if (welcome && !welcome.lastMessageId) {
      await welcome.send(t('members.welcomePrompt', { member: guild.name }, { guildId: guild.id }));
    }

    // Game updates / changelogs
    const gameUpdates = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === (CHANNEL_NAMES.gameUpdates || 'game-updates'));
    if (gameUpdates && !gameUpdates.lastMessageId) {
      await gameUpdates.send(t('setup.gameUpdatesPlaceholder', {}, { guildId: guild.id }) || '🎮 MISES À JOUR DES JEUX\nCe channel affichera les changelogs des jeux suivis.');
    }

    // Suggestions forum placeholder
    const suggestions = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === 'suggestions');
    if (suggestions && !suggestions.lastMessageId) {
      await suggestions.send(t('setup.suggestionsPlaceholder', {}, { guildId: guild.id }) || '💡 SUGGESTIONS & IDÉES\nProposez vos idées ici en créant un nouveau post !');
    }

    // Server list placeholder
    const serverList = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === CHANNEL_NAMES.serverList);
    if (serverList && !serverList.lastMessageId) {
      await serverList.send(t('setup.serverListPlaceholder', {}, { guildId: guild.id }) || '🖥️ SERVEURS DE JEU DISPONIBLES\nAucun serveur configuré pour le moment.');
    }

    // Voice create seed button is handled by setup.createSetupArea when needed
    // Ensure creer-channel has a button to open the Create-Channel flow
    const voiceCreate = guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === (CHANNEL_NAMES.voiceCreate || 'creer-channel'));
    if (voiceCreate && !voiceCreate.lastMessageId) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('creer:open').setLabel(t('tempVoice.createButton', {}, { guildId: guild.id }) || 'Créer un vocal').setStyle(ButtonStyle.Primary)
      );
      await voiceCreate.send({ content: t('tempVoice.panelText', {}, { guildId: guild.id }) || 'Cliquez pour créer un vocal temporaire', components: [row] }).catch(() => undefined);
    }
  } catch (error) {
    logger.error('Failed to seed guild messages', error);
  }
}

module.exports = { seedGuildMessages };
