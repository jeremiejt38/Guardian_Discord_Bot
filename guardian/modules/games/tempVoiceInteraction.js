const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder } = require('discord.js');
const { getDb } = require('../../database/db');
const { CHANNEL_NAMES } = require('../../config');
const { getGuildSetting } = require('../config/settings');
const { findTextChannelByName } = require('../utils/channels');
const { replyEphemeral } = require('../utils/interactions');
const { getGuildGames } = require('./gameList');
const { createTemporaryVoice, trackTempVoice } = require('./gamesVocal');
const { t } = require('../../locales');
const logger = require('../logs/logger');

const IDS = Object.freeze({
  createButton: 'tempvoice:create',
  gameSelect: 'tempvoice:select'
});

function getMemberGrade(guildId, userId) {
  const db = getDb();
  const row = db.prepare('SELECT grade FROM members WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  return row?.grade || null;
}

function canCreateTempVoice(guildId, userId) {
  const grade = getMemberGrade(guildId, userId);
  return Boolean(grade && grade !== 'invite');
}

function buildName(prefix, gameName, suffix, index = 0) {
  const base = [prefix || '', gameName || '', suffix || '']
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (index <= 0) {
    return base;
  }

  return `${base} ${index + 1}`;
}

function getNextVoiceName(guild, prefix, gameName, suffix) {
  let index = 0;
  while (index < 100) {
    const candidate = buildName(prefix, gameName, suffix, index);
    const exists = guild.channels.cache.some(
      (channel) => channel.isVoiceBased() && channel.name.toLowerCase() === candidate.toLowerCase()
    );

    if (!exists) {
      return candidate;
    }

    index += 1;
  }

  return `${buildName(prefix, gameName, suffix, 0)}-${Date.now().toString().slice(-4)}`;
}

function buildGameSelect(guildId, games) {
  const options = games.slice(0, 25).map((game) => ({
    label: game.name.slice(0, 100),
    value: String(game.game_id)
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(IDS.gameSelect)
      .setPlaceholder(t('tempVoice.selectPlaceholder', {}, { guildId }))
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options)
  );
}

async function ensureTempVoicePanelForGuild(guild) {
  const channel = findTextChannelByName(guild, CHANNEL_NAMES.voiceCreate);
  if (!channel) {
    return;
  }

  const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const hasPanel = recent?.some(
    (message) =>
      message.author.id === guild.client.user.id &&
      message.components.some((row) => row.components.some((component) => component.customId === IDS.createButton))
  );

  if (hasPanel) {
    return;
  }

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.createButton)
      .setStyle(ButtonStyle.Primary)
      .setLabel(t('tempVoice.createButton', {}, { guildId: guild.id }))
  );

  await channel.send({
    content: t('tempVoice.panelText', {}, { guildId: guild.id }),
    components: [actions]
  }).catch((error) => logger.error('Failed to post temp voice panel', error));
}

async function handleTempVoiceInteraction(interaction) {
  if (!interaction.guildId || !interaction.customId) {
    return false;
  }

  if (interaction.isButton() && interaction.customId === IDS.createButton) {
    if (!canCreateTempVoice(interaction.guildId, interaction.user.id)) {
      await replyEphemeral(interaction, t('tempVoice.forbiddenInvite', {}, { guildId: interaction.guildId }));
      return true;
    }

    const games = getGuildGames(interaction.guildId);
    if (!games.length) {
      await replyEphemeral(interaction, t('tempVoice.noGames', {}, { guildId: interaction.guildId }));
      return true;
    }

    await interaction.reply({
      content: t('tempVoice.selectPrompt', {}, { guildId: interaction.guildId }),
      components: [buildGameSelect(interaction.guildId, games)],
      ephemeral: true
    });
    return true;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === IDS.gameSelect) {
    if (!canCreateTempVoice(interaction.guildId, interaction.user.id)) {
      await interaction.update({
        content: t('tempVoice.forbiddenInvite', {}, { guildId: interaction.guildId }),
        components: []
      });
      return true;
    }

    const gameId = Number.parseInt(interaction.values[0], 10);
    const games = getGuildGames(interaction.guildId);
    const game = games.find((item) => Number(item.game_id) === gameId);
    if (!game) {
      await interaction.update({
        content: t('tempVoice.invalidGame', {}, { guildId: interaction.guildId }),
        components: []
      });
      return true;
    }

    const prefix = getGuildSetting(interaction.guildId, 'vocaux', 'name_prefix', '🎮');
    const suffix = getGuildSetting(interaction.guildId, 'vocaux', 'name_suffix', 'Partie');
    const userLimit = Math.max(0, Number(getGuildSetting(interaction.guildId, 'vocaux', 'max_members', 0)));
    const category = interaction.guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === 'vocaux'
    );

    const channelName = getNextVoiceName(interaction.guild, prefix, game.name, suffix);
    const created = await createTemporaryVoice(interaction.guild, channelName, userLimit, category?.id || null);
    trackTempVoice(created.id, interaction.guildId, gameId, interaction.user.id);

    const requester = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (requester?.voice?.channel) {
      await requester.voice.setChannel(created).catch(() => undefined);
    }

    await interaction.update({
      content: t('tempVoice.created', { channel: `<#${created.id}>` }, { guildId: interaction.guildId }),
      components: []
    });
    return true;
  }

  return false;
}

module.exports = {
  IDS,
  ensureTempVoicePanelForGuild,
  handleTempVoiceInteraction
};
