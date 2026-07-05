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
const { t } = require('../i18n');
const { replyEphemeral } = require('../utils/interactions');
const { findTextChannelByName } = require('../utils/channels');
const { getGuildSetting, setGuildSetting } = require('./settings');
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { logConfigChange } = require('./configLogger');
const { getDb } = require('../../database/db');

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

function buildPanelContent(guildId) {
  const games = getGamesForGuild(guildId);
  const lines = [`**${t(guildId, 'config.jeux.title')}**\n`];
  if (games.length === 0) {
    lines.push(t(guildId, 'config.jeux.noGames'));
  } else {
    for (const g of games) {
      lines.push(
        `• **${g.name}** — Galerie: ${g.galerie_enabled ? '✅' : '❌'} | Changelog: ${g.changelog_enabled ? '✅' : '❌'} | Steam: \`${g.steam_app_id || 'N/A'}\``
      );
    }
  }
  lines.push(`\n${t(guildId, 'config.jeux.hint')}`);
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

async function seedJeuxPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.jeux);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const hasPanel = msgs?.some((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (hasPanel) return;
  const guildId = guild.id;
  const components = [];
  const selectRow = buildSelectRow(guildId);
  if (selectRow) components.push(selectRow);
  await channel.send({ content: buildPanelContent(guildId), components }).catch(() => undefined);
}

async function refreshJeuxPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.jeux);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const panel = msgs?.find((m) => m.author.id === guild.client.user.id && m.components.length >= 0);
  if (!panel) return;
  const guildId = guild.id;
  const components = [];
  const selectRow = buildSelectRow(guildId);
  if (selectRow) components.push(selectRow);
  await panel.edit({ content: buildPanelContent(guildId), components }).catch(() => undefined);
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

  return false;
}

module.exports = { seedJeuxPanel, handleJeuxInteraction };
