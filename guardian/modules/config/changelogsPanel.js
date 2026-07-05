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
const { logConfigChange } = require('./configLogger');

const IDS = Object.freeze({
  toggleGlobal: 'changelogs:toggle:global',
  toggleAggregate: 'changelogs:toggle:aggregate',
  editFrequency: 'changelogs:edit:frequency',
  frequencyModal: 'changelogs:modal:frequency'
});

function hasManagerGrade(member, guildId) {
  const mappings = getGradeMappings(guildId);
  return [GRADE_NAMES.manager, GRADE_NAMES.owner].some(
    (g) => mappings[g] && member.roles.cache.has(mappings[g])
  );
}

function buildPanelContent(guildId) {
  const enabled = getGuildSetting(guildId, 'changelogs', 'enabled', true);
  const aggregate = getGuildSetting(guildId, 'changelogs', 'aggregate_game_updates', true);
  const frequency = getGuildSetting(guildId, 'changelogs', 'frequency_minutes', 60);
  return [
    `**${t(guildId, 'config.changelogs.title')}**\n`,
    `• **${t(guildId, 'config.changelogs.enabled')}** : ${enabled ? '✅' : '❌'}`,
    `• **${t(guildId, 'config.changelogs.aggregate')}** : ${aggregate ? '✅' : '❌'}`,
    `• **${t(guildId, 'config.changelogs.frequency')}** : ${frequency} min`
  ].join('\n');
}

function buildRows(guildId) {
  const enabled = getGuildSetting(guildId, 'changelogs', 'enabled', true);
  const aggregate = getGuildSetting(guildId, 'changelogs', 'aggregate_game_updates', true);
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(IDS.toggleGlobal).setLabel(`Changelogs: ${enabled ? 'ON' : 'OFF'}`).setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(IDS.toggleAggregate).setLabel(`#game-updates: ${aggregate ? 'ON' : 'OFF'}`).setStyle(aggregate ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(IDS.editFrequency).setLabel(t(guildId, 'config.changelogs.editFrequency')).setStyle(ButtonStyle.Primary)
    )
  ];
}

async function seedChangelogsPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.changelogs);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const hasPanel = msgs?.some((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (hasPanel) return;
  const guildId = guild.id;
  await channel.send({ content: buildPanelContent(guildId), components: buildRows(guildId) }).catch(() => undefined);
}

async function refreshChangelogsPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.changelogs);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const panel = msgs?.find((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (!panel) return;
  const guildId = guild.id;
  await panel.edit({ content: buildPanelContent(guildId), components: buildRows(guildId) }).catch(() => undefined);
}

async function handleChangelogsInteraction(interaction) {
  const { customId, guildId } = interaction;
  if (!customId?.startsWith('changelogs:')) return false;

  if (!hasManagerGrade(interaction.member, guildId)) {
    await replyEphemeral(interaction, t(guildId, 'config.managerOnly'));
    return true;
  }

  if (interaction.isButton() && customId === IDS.toggleGlobal) {
    const current = getGuildSetting(guildId, 'changelogs', 'enabled', true);
    setGuildSetting(guildId, 'changelogs', 'enabled', !current);
    await logConfigChange(interaction.guild, interaction.user.id, 'changelogs.enabled', current, !current);
    await refreshChangelogsPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.changelogs.toggled', { state: !current ? 'ON' : 'OFF' }));
    return true;
  }

  if (interaction.isButton() && customId === IDS.toggleAggregate) {
    const current = getGuildSetting(guildId, 'changelogs', 'aggregate_game_updates', true);
    setGuildSetting(guildId, 'changelogs', 'aggregate_game_updates', !current);
    await logConfigChange(interaction.guild, interaction.user.id, 'changelogs.aggregate_game_updates', current, !current);
    await refreshChangelogsPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.changelogs.aggregateToggled', { state: !current ? 'ON' : 'OFF' }));
    return true;
  }

  if (interaction.isButton() && customId === IDS.editFrequency) {
    const modal = new ModalBuilder().setCustomId(IDS.frequencyModal).setTitle(t(guildId, 'config.changelogs.editFrequency'))
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('minutes').setLabel(t(guildId, 'config.changelogs.frequencyLabel'))
          .setStyle(TextInputStyle.Short).setPlaceholder('60').setRequired(true).setMaxLength(4)
      ));
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.isModalSubmit() && customId === IDS.frequencyModal) {
    const raw = interaction.fields.getTextInputValue('minutes').trim();
    const minutes = Number.parseInt(raw, 10);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
      await replyEphemeral(interaction, t(guildId, 'config.changelogs.invalidFrequency'));
      return true;
    }
    const old = getGuildSetting(guildId, 'changelogs', 'frequency_minutes', 60);
    setGuildSetting(guildId, 'changelogs', 'frequency_minutes', minutes);
    await logConfigChange(interaction.guild, interaction.user.id, 'changelogs.frequency_minutes', old, minutes);
    await refreshChangelogsPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.changelogs.frequencyUpdated', { minutes: String(minutes) }));
    return true;
  }

  return false;
}

module.exports = { seedChangelogsPanel, handleChangelogsInteraction };
