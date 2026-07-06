const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { CHANNELS, GRADE_NAMES } = require('../../config');
const { t } = require('../i18n');
const { replyEphemeral } = require('../utils/interactions');
const { findTextChannelByName } = require('../utils/channels');
const { getGuildSetting, setGuildSetting } = require('./settings');
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { getAvailableLanguages, getGuildLanguage, setGuildLanguage } = require('../i18n');
const { logConfigChange } = require('./configLogger');

const IDS = Object.freeze({
  editSteamKey: 'bot:edit:steamkey',
  steamKeyModal: 'bot:modal:steamkey',
  editLanguage: 'bot:edit:language',
  languageModal: 'bot:modal:language'
});

function hasOwnerGrade(member, guildId) {
  const mappings = getGradeMappings(guildId);
  const ownerRoleId = mappings[GRADE_NAMES.owner];
  return ownerRoleId && member.roles.cache.has(ownerRoleId);
}

function hasManagerGrade(member, guildId) {
  const mappings = getGradeMappings(guildId);
  return [GRADE_NAMES.manager, GRADE_NAMES.owner].some(
    (g) => mappings[g] && member.roles.cache.has(mappings[g])
  );
}

function buildPanelContent(guildId) {
  const lang = getGuildLanguage(guildId) || 'fr';
  const steamKey = getGuildSetting(guildId, 'bot', 'steam_api_key', null);
  const steamStatus = steamKey ? '✅ Configurée' : '❌ Non configurée';
  return [
    `**${t(guildId, 'config.bot.title')}**\n`,
    `• **${t(guildId, 'config.bot.language')}** : \`${lang}\``,
    `• **${t(guildId, 'config.bot.steamKey')}** : ${steamStatus}`
  ].join('\n');
}

function buildRows(guildId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(IDS.editLanguage)
        .setLabel(t(guildId, 'config.bot.editLanguage'))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(IDS.editSteamKey)
        .setLabel(t(guildId, 'config.bot.editSteamKey'))
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function seedBotPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.botConfig);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const hasPanel = msgs?.some((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (hasPanel) return;
  const guildId = guild.id;
  await channel.send({ content: buildPanelContent(guildId), components: buildRows(guildId) }).catch(() => undefined);
}

async function refreshBotPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.botConfig);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const panel = msgs?.find((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (!panel) return;
  const guildId = guild.id;
  await panel.edit({ content: buildPanelContent(guildId), components: buildRows(guildId) }).catch(() => undefined);
}

async function handleBotInteraction(interaction) {
  const { customId, guildId } = interaction;
  if (!customId?.startsWith('bot:')) return false;

  if (!hasManagerGrade(interaction.member, guildId)) {
    await replyEphemeral(interaction, t(guildId, 'config.managerOnly'));
    return true;
  }

  if (interaction.isButton() && customId === IDS.editLanguage) {
    const langs = getAvailableLanguages();
    const modal = new ModalBuilder()
      .setCustomId(IDS.languageModal)
      .setTitle(t(guildId, 'config.bot.languageModalTitle'))
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('lang')
            .setLabel(t(guildId, 'config.bot.languageLabel', { available: langs.join(', ') }))
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('fr')
            .setValue(getGuildLanguage(guildId) || 'fr')
            .setRequired(true)
            .setMaxLength(5)
        )
      );
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.isModalSubmit() && customId === IDS.languageModal) {
    const lang = interaction.fields.getTextInputValue('lang').trim().toLowerCase();
    const langs = getAvailableLanguages();
    if (!langs.includes(lang)) {
      await replyEphemeral(interaction, t(guildId, 'config.bot.invalidLanguage', { available: langs.join(', ') }));
      return true;
    }
    const old = getGuildLanguage(guildId);
    setGuildLanguage(guildId, lang);
    await logConfigChange(interaction.guild, interaction.user.id, 'bot.language', old, lang);
    await refreshBotPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.bot.languageUpdated', { lang }));
    return true;
  }

  if (!hasOwnerGrade(interaction.member, guildId)) {
    await replyEphemeral(interaction, t(guildId, 'config.ownerOnly'));
    return true;
  }

  if (interaction.isButton() && customId === IDS.editSteamKey) {
    const modal = new ModalBuilder()
      .setCustomId(IDS.steamKeyModal)
      .setTitle(t(guildId, 'config.bot.steamKeyModalTitle'))
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('key')
            .setLabel(t(guildId, 'config.bot.steamKeyLabel'))
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(40)
        )
      );
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.isModalSubmit() && customId === IDS.steamKeyModal) {
    const key = interaction.fields.getTextInputValue('key').trim();
    const old = getGuildSetting(guildId, 'bot', 'steam_api_key', null);
    setGuildSetting(guildId, 'bot', 'steam_api_key', key || null);
    await logConfigChange(interaction.guild, interaction.user.id, 'bot.steam_api_key', old ? '***' : null, key ? '***' : null);
    await refreshBotPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, key ? 'config.bot.steamKeySet' : 'config.bot.steamKeyCleared'));
    return true;
  }

  return false;
}

module.exports = { seedBotPanel, refreshBotPanel, handleBotInteraction };
