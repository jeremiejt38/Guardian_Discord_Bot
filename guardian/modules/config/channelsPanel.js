const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CHANNELS, GRADE_NAMES } = require('../../config');
const { t } = require('../i18n');
const { replyEphemeral } = require('../utils/interactions');
const { findTextChannelByName } = require('../utils/channels');
const { getGuildSetting, setGuildSetting } = require('./settings');
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { logConfigChange } = require('./configLogger');

const TOGGLES = [
  { key: 'afk_enabled', label: 'Canal AFK', id: 'channels:toggle:afk' },
  { key: 'galerie_enabled', label: 'Galerie par jeu', id: 'channels:toggle:galerie' },
  { key: 'suggestions_enabled', label: 'Module Suggestions', id: 'channels:toggle:suggestions' },
  { key: 'serveurs_enabled', label: 'Module Liste-Serveurs', id: 'channels:toggle:serveurs' },
  { key: 'statusbot_enabled', label: 'Module Statut-Bot', id: 'channels:toggle:statusbot' }
];

function hasManagerGrade(member, guildId) {
  const mappings = getGradeMappings(guildId);
  return [GRADE_NAMES.manager, GRADE_NAMES.owner].some(
    (g) => mappings[g] && member.roles.cache.has(mappings[g])
  );
}

function buildPanelContent(guildId) {
  const lines = [`**${t(guildId, 'config.channels.title')}**\n`];
  for (const toggle of TOGGLES) {
    const val = getGuildSetting(guildId, 'channels', toggle.key, true);
    lines.push(`• **${toggle.label}** : ${val ? '✅' : '❌'}`);
  }
  return lines.join('\n');
}

function buildRows(guildId) {
  const buttons = TOGGLES.map((toggle) => {
    const val = getGuildSetting(guildId, 'channels', toggle.key, true);
    return new ButtonBuilder()
      .setCustomId(toggle.id)
      .setLabel(`${toggle.label}: ${val ? 'ON' : 'OFF'}`)
      .setStyle(val ? ButtonStyle.Success : ButtonStyle.Secondary);
  });

  const rows = [];
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 3)));
  }
  return rows;
}

async function seedChannelsPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.channelsConfig);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const hasPanel = msgs?.some((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (hasPanel) return;
  const guildId = guild.id;
  await channel.send({ content: buildPanelContent(guildId), components: buildRows(guildId) }).catch(() => undefined);
}

async function refreshChannelsPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.channelsConfig);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const panel = msgs?.find((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (!panel) return;
  const guildId = guild.id;
  await panel.edit({ content: buildPanelContent(guildId), components: buildRows(guildId) }).catch(() => undefined);
}

async function handleChannelsInteraction(interaction) {
  const { customId, guildId } = interaction;
  if (!customId?.startsWith('channels:toggle:')) return false;

  if (!hasManagerGrade(interaction.member, guildId)) {
    await replyEphemeral(interaction, t(guildId, 'config.managerOnly'));
    return true;
  }

  const toggle = TOGGLES.find((tg) => tg.id === customId);
  if (!toggle) return false;

  const current = getGuildSetting(guildId, 'channels', toggle.key, true);
  setGuildSetting(guildId, 'channels', toggle.key, !current);
  await logConfigChange(interaction.guild, interaction.user.id, `channels.${toggle.key}`, current, !current);
  await refreshChannelsPanel(interaction.guild);
  await replyEphemeral(interaction, t(guildId, 'config.channels.toggled', { name: toggle.label, state: !current ? 'ON' : 'OFF' }));
  return true;
}

module.exports = { seedChannelsPanel, handleChannelsInteraction };
