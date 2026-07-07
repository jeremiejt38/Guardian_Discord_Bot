const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { CHANNELS, GRADE_NAMES } = require('../../config');
const { isNonSteamId } = require('../games/steamGamesList');
const { t } = require('../i18n');
const { replyEphemeral } = require('../utils/interactions');
const { findTextChannelByName } = require('../utils/channels');
const { getGuildSetting, setGuildSetting } = require('./settings');
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { logConfigChange } = require('./configLogger');
const { getDb } = require('../../database/db');

const CHANGELOGS_IDS = Object.freeze({
  toggleGlobal: 'changelogs:toggle:global',
  toggleAggregate: 'changelogs:toggle:aggregate',
  editFrequency: 'changelogs:edit:frequency',
  frequencyModal: 'changelogs:modal:frequency'
});

const IDS = Object.freeze({
  selectGame: 'jeux:select:game',
  toggleGalerie: 'jeux:toggle:galerie:',
  toggleChangelog: 'jeux:toggle:changelog:',
  editSteamId: 'jeux:edit:steamid:',
  steamIdModal: 'jeux:modal:steamid:'
});

function hasManagerGrade(member, guildId) {
  const mappings = getGradeMappings(guildId);
  return [GRADE_NAMES.manager, GRADE_NAMES.owner].some(
    (g) => mappings[g] && member.roles.cache.has(mappings[g])
  );
}

function getGamesForGuild(guildId) {
  return getDb().prepare('SELECT * FROM games WHERE guild_id = ?').all(guildId);
}

function buildChangelogsSectionContent(guildId) {
  const enabled = getGuildSetting(guildId, 'changelogs', 'enabled', true);
  const aggregate = getGuildSetting(guildId, 'changelogs', 'aggregate_game_updates', true);
  const frequency = getGuildSetting(guildId, 'changelogs', 'frequency_minutes', 60);
  return [
    `\n**${t(guildId, 'config.changelogs.title')}**`,
    `• **${t(guildId, 'config.changelogs.enabled')}** : ${enabled ? '✅' : '❌'}`,
    `• **${t(guildId, 'config.changelogs.aggregate')}** : ${aggregate ? '✅' : '❌'}`,
    `• **${t(guildId, 'config.changelogs.frequency')}** : ${frequency} min`
  ].join('\n');
}

function buildPanelContent(guildId) {
  const games = getGamesForGuild(guildId);
  const lines = [`**${t(guildId, 'config.jeux.title')}**\n`];
  if (games.length === 0) {
    lines.push(t(guildId, 'config.jeux.noGames'));
  } else {
    for (const g of games) {
      lines.push(
        `• **${g.name}** — Galerie: ${g.galerie_enabled ? '✅' : '❌'} | Changelog: ${g.changelog_enabled ? '✅' : '❌'} | Steam: ${g.steam_app_id && !isNonSteamId(g.steam_app_id) ? `\`${g.steam_app_id}\`` : '*(non-Steam)*'}`
      );
    }
  }
  lines.push(`\n${t(guildId, 'config.jeux.hint')}`);
  lines.push(buildChangelogsSectionContent(guildId));
  return lines.join('\n');
}

function buildSelectRow(guildId) {
  const games = getGamesForGuild(guildId).slice(0, 25);
  if (games.length === 0) return null;
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(IDS.selectGame)
      .setPlaceholder(t(guildId, 'config.jeux.selectPlaceholder'))
      .addOptions(games.map((g) => ({ label: g.name.slice(0, 100), value: String(g.game_id) })))
  );
}

function buildChangelogsRow(guildId) {
  const enabled = getGuildSetting(guildId, 'changelogs', 'enabled', true);
  const aggregate = getGuildSetting(guildId, 'changelogs', 'aggregate_game_updates', true);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CHANGELOGS_IDS.toggleGlobal).setLabel(`Changelogs: ${enabled ? 'ON' : 'OFF'}`).setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CHANGELOGS_IDS.toggleAggregate).setLabel(`#game-updates: ${aggregate ? 'ON' : 'OFF'}`).setStyle(aggregate ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CHANGELOGS_IDS.editFrequency).setLabel(t(guildId, 'config.changelogs.editFrequency')).setStyle(ButtonStyle.Primary)
  );
}

function buildComponents(guildId) {
  const components = [];
  const selectRow = buildSelectRow(guildId);
  if (selectRow) components.push(selectRow);
  components.push(buildChangelogsRow(guildId));
  return components;
}

async function seedJeuxPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.jeux);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const hasPanel = msgs?.some((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (hasPanel) return;
  const guildId = guild.id;
  await channel.send({ content: buildPanelContent(guildId), components: buildComponents(guildId) }).catch(() => undefined);
}

async function refreshJeuxPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.jeux);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const panel = msgs?.find((m) => m.author.id === guild.client.user.id && m.components.length >= 0);
  if (!panel) return;
  const guildId = guild.id;
  await panel.edit({ content: buildPanelContent(guildId), components: buildComponents(guildId) }).catch(() => undefined);
}

function buildGameActionRows(guildId, gameId) {
  const game = getDb().prepare('SELECT * FROM games WHERE game_id = ?').get(gameId);
  if (!game) return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${IDS.toggleGalerie}${gameId}`).setLabel(`Galerie: ${game.galerie_enabled ? 'ON' : 'OFF'}`).setStyle(game.galerie_enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`${IDS.toggleChangelog}${gameId}`).setLabel(`Changelog: ${game.changelog_enabled ? 'ON' : 'OFF'}`).setStyle(game.changelog_enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`${IDS.editSteamId}${gameId}`).setLabel(`Steam AppID: ${game.steam_app_id || 'N/A'}`).setStyle(ButtonStyle.Primary)
    )
  ];
}

async function handleJeuxInteraction(interaction) {
  const { customId, guildId } = interaction;
  if (!customId?.startsWith('jeux:')) return false;

  if (!hasManagerGrade(interaction.member, guildId)) {
    await replyEphemeral(interaction, t(guildId, 'config.managerOnly'));
    return true;
  }

  if (interaction.isStringSelectMenu() && customId === IDS.selectGame) {
    const gameId = Number(interaction.values[0]);
    const game = getDb().prepare('SELECT * FROM games WHERE game_id = ?').get(gameId);
    if (!game) {
      await replyEphemeral(interaction, t(guildId, 'config.jeux.notFound'));
      return true;
    }
    const rows = buildGameActionRows(guildId, gameId);
    await interaction.reply({ content: `**${game.name}** — Configurez les options :`, components: rows, ephemeral: true });
    return true;
  }

  if (interaction.isButton() && customId.startsWith(IDS.toggleGalerie)) {
    const gameId = Number(customId.slice(IDS.toggleGalerie.length));
    const game = getDb().prepare('SELECT * FROM games WHERE game_id = ?').get(gameId);
    if (!game) { await replyEphemeral(interaction, t(guildId, 'config.jeux.notFound')); return true; }
    const newVal = game.galerie_enabled ? 0 : 1;
    getDb().prepare('UPDATE games SET galerie_enabled = ? WHERE game_id = ?').run(newVal, gameId);
    await logConfigChange(interaction.guild, interaction.user.id, `game.${game.name}.galerie_enabled`, game.galerie_enabled, newVal);
    await refreshJeuxPanel(interaction.guild);
    const rows = buildGameActionRows(guildId, gameId);
    await interaction.update({ content: `**${game.name}** — Configurez les options :`, components: rows });
    return true;
  }

  if (interaction.isButton() && customId.startsWith(IDS.toggleChangelog)) {
    const gameId = Number(customId.slice(IDS.toggleChangelog.length));
    const game = getDb().prepare('SELECT * FROM games WHERE game_id = ?').get(gameId);
    if (!game) { await replyEphemeral(interaction, t(guildId, 'config.jeux.notFound')); return true; }
    const newVal = game.changelog_enabled ? 0 : 1;
    getDb().prepare('UPDATE games SET changelog_enabled = ? WHERE game_id = ?').run(newVal, gameId);
    await logConfigChange(interaction.guild, interaction.user.id, `game.${game.name}.changelog_enabled`, game.changelog_enabled, newVal);
    await refreshJeuxPanel(interaction.guild);
    const rows = buildGameActionRows(guildId, gameId);
    await interaction.update({ content: `**${game.name}** — Configurez les options :`, components: rows });
    return true;
  }

  if (interaction.isButton() && customId.startsWith(IDS.editSteamId)) {
    const gameId = Number(customId.slice(IDS.editSteamId.length));
    const modal = new ModalBuilder().setCustomId(`${IDS.steamIdModal}${gameId}`).setTitle(t(guildId, 'config.jeux.steamModalTitle'))
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('appid').setLabel('Steam AppID').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20)
      ));
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.isModalSubmit() && customId.startsWith(IDS.steamIdModal)) {
    const gameId = Number(customId.slice(IDS.steamIdModal.length));
    const appId = interaction.fields.getTextInputValue('appid').trim() || null;
    const game = getDb().prepare('SELECT * FROM games WHERE game_id = ?').get(gameId);
    if (!game) { await replyEphemeral(interaction, t(guildId, 'config.jeux.notFound')); return true; }
    getDb().prepare('UPDATE games SET steam_app_id = ? WHERE game_id = ?').run(appId, gameId);
    await logConfigChange(interaction.guild, interaction.user.id, `game.${game.name}.steam_app_id`, game.steam_app_id, appId);
    await refreshJeuxPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.jeux.steamUpdated', { name: game.name, appId: appId || 'N/A' }));
    return true;
  }

  if (interaction.isButton() && customId === CHANGELOGS_IDS.toggleGlobal) {
    const current = getGuildSetting(guildId, 'changelogs', 'enabled', true);
    setGuildSetting(guildId, 'changelogs', 'enabled', !current);
    await logConfigChange(interaction.guild, interaction.user.id, 'changelogs.enabled', current, !current);
    await refreshJeuxPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.changelogs.toggled', { state: !current ? 'ON' : 'OFF' }));
    return true;
  }

  if (interaction.isButton() && customId === CHANGELOGS_IDS.toggleAggregate) {
    const current = getGuildSetting(guildId, 'changelogs', 'aggregate_game_updates', true);
    setGuildSetting(guildId, 'changelogs', 'aggregate_game_updates', !current);
    await logConfigChange(interaction.guild, interaction.user.id, 'changelogs.aggregate_game_updates', current, !current);
    await refreshJeuxPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.changelogs.aggregateToggled', { state: !current ? 'ON' : 'OFF' }));
    return true;
  }

  if (interaction.isButton() && customId === CHANGELOGS_IDS.editFrequency) {
    const modal = new ModalBuilder().setCustomId(CHANGELOGS_IDS.frequencyModal).setTitle(t(guildId, 'config.changelogs.editFrequency'))
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('minutes').setLabel(t(guildId, 'config.changelogs.frequencyLabel'))
          .setStyle(TextInputStyle.Short).setPlaceholder('60').setRequired(true).setMaxLength(4)
      ));
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.isModalSubmit() && customId === CHANGELOGS_IDS.frequencyModal) {
    const raw = interaction.fields.getTextInputValue('minutes').trim();
    const minutes = Number.parseInt(raw, 10);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
      await replyEphemeral(interaction, t(guildId, 'config.changelogs.invalidFrequency'));
      return true;
    }
    const old = getGuildSetting(guildId, 'changelogs', 'frequency_minutes', 60);
    setGuildSetting(guildId, 'changelogs', 'frequency_minutes', minutes);
    await logConfigChange(interaction.guild, interaction.user.id, 'changelogs.frequency_minutes', old, minutes);
    await refreshJeuxPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.changelogs.frequencyUpdated', { minutes: String(minutes) }));
    return true;
  }

  return false;
}

module.exports = { seedJeuxPanel, refreshJeuxPanel, handleJeuxInteraction };
