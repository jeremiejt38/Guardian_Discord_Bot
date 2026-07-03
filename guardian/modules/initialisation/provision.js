const { ChannelType } = require('discord.js');
const { CHANNEL_NAMES } = require('../../config');
const { getGuildSetting } = require('../config/settings');
const logger = require('../logs/logger');

const CATEGORIES = Object.freeze({
  information: 'informations',
  communaute: 'communaute',
  vocaux: 'vocaux',
  moderation: 'moderation',
  configuration: 'configuration'
});

async function ensureCategory(guild, name) {
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === name
  );
  if (existing) {
    return existing;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory
  });
}

async function ensureTextChannel(guild, name, categoryId) {
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === name && channel.parentId === categoryId
  );
  if (existing) {
    return existing;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: categoryId
  });
}

async function ensureVoiceChannel(guild, name, categoryId) {
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildVoice && channel.name === name && channel.parentId === categoryId
  );
  if (existing) {
    return existing;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: categoryId
  });
}

async function provisionGuildStructure(guild) {
  try {
    const info = await ensureCategory(guild, CATEGORIES.information);
    const community = await ensureCategory(guild, CATEGORIES.communaute);
    const voice = await ensureCategory(guild, CATEGORIES.vocaux);
    const moderation = await ensureCategory(guild, CATEGORIES.moderation);
    const configuration = await ensureCategory(guild, CATEGORIES.configuration);

    await ensureTextChannel(guild, 'regles', info.id);
    await ensureTextChannel(guild, 'annonces', info.id);
    await ensureTextChannel(guild, CHANNEL_NAMES.welcome, info.id);
    await ensureTextChannel(guild, 'faq', info.id);

    const statusBotEnabled = getGuildSetting(guild.id, 'channels', 'status_bot_enabled', true);
    if (statusBotEnabled) {
      await ensureTextChannel(guild, 'statut-bot', info.id);
    }

    await ensureTextChannel(guild, 'general', community.id);

    const gameUpdatesEnabled = getGuildSetting(guild.id, 'channels', 'game_updates_enabled', true);
    if (gameUpdatesEnabled) {
      await ensureTextChannel(guild, CHANNEL_NAMES.gameUpdates, community.id);
    }

    const suggestionsEnabled = getGuildSetting(guild.id, 'channels', 'suggestions_enabled', true);
    if (suggestionsEnabled) {
      await ensureTextChannel(guild, 'suggestions', community.id);
    }

    const serverListEnabled = getGuildSetting(guild.id, 'channels', 'server_list_enabled', false);
    if (serverListEnabled) {
      await ensureTextChannel(guild, CHANNEL_NAMES.serverList, community.id);
    }

    await ensureTextChannel(guild, CHANNEL_NAMES.voiceCreate, voice.id);
    await ensureVoiceChannel(guild, 'General', voice.id);

    const afkEnabled = getGuildSetting(guild.id, 'channels', 'afk_enabled', true);
    if (afkEnabled) {
      await ensureVoiceChannel(guild, 'AFK', voice.id);
    }

    await ensureTextChannel(guild, 'general-staff', moderation.id);
    await ensureTextChannel(guild, CHANNEL_NAMES.requests, moderation.id);
    await ensureTextChannel(guild, CHANNEL_NAMES.moderationLogs, moderation.id);
    await ensureTextChannel(guild, 'sanctions', moderation.id);
    await ensureTextChannel(guild, 'rapports', moderation.id);
    await ensureVoiceChannel(guild, 'Vocal Staff', moderation.id);

    await ensureTextChannel(guild, CHANNEL_NAMES.gameChannels, configuration.id);
    await ensureTextChannel(guild, CHANNEL_NAMES.gameList, configuration.id);
    await ensureTextChannel(guild, 'bot', configuration.id);
    await ensureTextChannel(guild, 'jeux-serveur', configuration.id);
    await ensureTextChannel(guild, 'membres', configuration.id);
    await ensureTextChannel(guild, 'channels', configuration.id);
    await ensureTextChannel(guild, 'vocaux', configuration.id);
    await ensureTextChannel(guild, 'jeux', configuration.id);
    await ensureTextChannel(guild, 'changelogs', configuration.id);
    await ensureTextChannel(guild, 'suggestions-config', configuration.id);
    await ensureTextChannel(guild, 'annonces-config', configuration.id);
    await ensureTextChannel(guild, 'faq-config', configuration.id);
    await ensureTextChannel(guild, 'serveurs-jeu', configuration.id);
    await ensureTextChannel(guild, 'gestion-serveurs', configuration.id);
    await ensureTextChannel(guild, 'guardian', configuration.id);
    await ensureTextChannel(guild, 'comportement', configuration.id);
    await ensureTextChannel(guild, 'auto-moderation', configuration.id);
    await ensureTextChannel(guild, 'roles', configuration.id);
    await ensureTextChannel(guild, CHANNEL_NAMES.configLogs, configuration.id);
  } catch (error) {
    logger.error('Failed to provision guild structure', error);
    throw error;
  }
}

module.exports = {
  provisionGuildStructure
};
