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
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { logConfigChange } = require('./configLogger');
const { getDb } = require('../../database/db');

const IDS = Object.freeze({
  addServer: 'serveurs-jeu:add',
  addModal: 'serveurs-jeu:modal:add',
  removePrefix: 'serveurs-jeu:remove:',
  approvePrefix: 'servers:approve:',
  rejectPrefix: 'servers:reject:'
});

function hasManagerGrade(member, guildId) {
  const mappings = getGradeMappings(guildId);
  return [GRADE_NAMES.manager, GRADE_NAMES.owner].some(
    (g) => mappings[g] && member.roles.cache.has(mappings[g])
  );
}

function getServers(guildId) {
  return getDb().prepare('SELECT * FROM servers_jeu WHERE guild_id = ?').all(guildId);
}

function statusEmoji(status) {
  if (status === 'online') return '✅';
  if (status === 'offline') return '❌';
  if (status === 'unstable') return '⚠️';
  return '❓';
}

function buildPanelContent(guildId) {
  const servers = getServers(guildId);
  const lines = [`**${t(guildId, 'config.serveursJeu.title')}**\n`];
  if (servers.length === 0) {
    lines.push(t(guildId, 'config.serveursJeu.noServers'));
  } else {
    for (const s of servers) {
      lines.push(`• **${s.name}** (${s.game}) — \`${s.ip}:${s.port}\` ${statusEmoji(s.last_status)}`);
    }
  }
  lines.push(`\n${t(guildId, 'config.serveursJeu.hint')}`);
  return lines.join('\n');
}

function buildRows(guildId) {
  const servers = getServers(guildId).slice(0, 4);
  const removeButtons = servers.map((s) =>
    new ButtonBuilder()
      .setCustomId(`${IDS.removePrefix}${s.server_id}`)
      .setLabel(`Retirer: ${s.name.slice(0, 20)}`)
      .setStyle(ButtonStyle.Danger)
  );

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(IDS.addServer).setLabel(t(guildId, 'config.serveursJeu.add')).setStyle(ButtonStyle.Primary)
    )
  ];
  if (removeButtons.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(removeButtons));
  }
  return rows;
}

async function seedServeursJeuPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.serveurs);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const hasPanel = msgs?.some((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (hasPanel) return;
  const guildId = guild.id;
  await channel.send({ content: buildPanelContent(guildId), components: buildRows(guildId) }).catch(() => undefined);
}

async function refreshServeursJeuPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.serveurs);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const panel = msgs?.find((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (!panel) return;
  const guildId = guild.id;
  await panel.edit({ content: buildPanelContent(guildId), components: buildRows(guildId) }).catch(() => undefined);
}

async function refreshServerListPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.serverList);
  if (!channel) return;
  const guildId = guild.id;
  const servers = getServers(guildId).filter((s) => s.approved);
  const lines = ['**🖥️ Serveurs de jeu disponibles**\n'];
  if (servers.length === 0) {
    lines.push('_Aucun serveur configuré pour le moment._');
  } else {
    for (const s of servers) {
      const emoji = s.last_status === 'online' ? '🟢' : s.last_status === 'offline' ? '🔴' : '🟡';
      lines.push(`${emoji} **${s.name}** (${s.game}) — \`${s.ip}:${s.port}\``);
    }
  }
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const existing = msgs?.find((m) => m.author.id === guild.client.user.id);
  const content = lines.join('\n');
  if (existing) {
    await existing.edit({ content }).catch(() => undefined);
  } else {
    await channel.send({ content }).catch(() => undefined);
  }
}

async function handleServeursJeuInteraction(interaction) {
  const { customId, guildId } = interaction;
  if (!customId?.startsWith('serveurs-jeu:') && !customId?.startsWith('servers:approve:') && !customId?.startsWith('servers:reject:')) return false;

  if (!hasManagerGrade(interaction.member, guildId)) {
    await replyEphemeral(interaction, t(guildId, 'config.managerOnly'));
    return true;
  }

  if (interaction.isButton() && customId === IDS.addServer) {
    const modal = new ModalBuilder()
      .setCustomId(IDS.addModal)
      .setTitle(t(guildId, 'config.serveursJeu.addModalTitle'))
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('name').setLabel(t(guildId, 'config.serveursJeu.nameLabel')).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('game').setLabel(t(guildId, 'config.serveursJeu.gameLabel')).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('ip').setLabel(t(guildId, 'config.serveursJeu.ipLabel')).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('port').setLabel(t(guildId, 'config.serveursJeu.portLabel')).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(6)
        )
      );
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.isModalSubmit() && customId === IDS.addModal) {
    const name = interaction.fields.getTextInputValue('name').trim();
    const game = interaction.fields.getTextInputValue('game').trim();
    const ip = interaction.fields.getTextInputValue('ip').trim();
    const portRaw = interaction.fields.getTextInputValue('port').trim();
    const port = Number.parseInt(portRaw, 10);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      await replyEphemeral(interaction, t(guildId, 'config.serveursJeu.invalidPort'));
      return true;
    }

    getDb().prepare(
      'INSERT INTO servers_jeu (guild_id, name, game, ip, port, approved) VALUES (?, ?, ?, ?, ?, 1)'
    ).run(guildId, name, game, ip, port);

    await logConfigChange(interaction.guild, interaction.user.id, 'servers_jeu.add', null, { name, game, ip, port });
    await refreshServeursJeuPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.serveursJeu.added', { name }));
    return true;
  }

  if (interaction.isButton() && customId.startsWith(IDS.removePrefix)) {
    const serverId = Number(customId.slice(IDS.removePrefix.length));
    const server = getDb().prepare('SELECT * FROM servers_jeu WHERE server_id = ?').get(serverId);
    if (!server) {
      await replyEphemeral(interaction, t(guildId, 'config.serveursJeu.notFound'));
      return true;
    }
    getDb().prepare('DELETE FROM servers_jeu WHERE server_id = ?').run(serverId);
    await logConfigChange(interaction.guild, interaction.user.id, 'servers_jeu.remove', { name: server.name }, null);
    await refreshServeursJeuPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.serveursJeu.removed', { name: server.name }));
    return true;
  }

  if (interaction.isButton() && customId.startsWith(IDS.approvePrefix)) {
    const serverId = Number(customId.slice(IDS.approvePrefix.length));
    const server = getDb().prepare('SELECT * FROM servers_jeu WHERE server_id = ?').get(serverId);
    if (!server) { await replyEphemeral(interaction, t(guildId, 'config.serveursJeu.notFound')); return true; }
    getDb().prepare('UPDATE servers_jeu SET approved = 1 WHERE server_id = ?').run(serverId);
    await refreshServeursJeuPanel(interaction.guild);
    await refreshServerListPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'servers.approved', { user: interaction.user.tag }));
    return true;
  }

  if (interaction.isButton() && customId.startsWith(IDS.rejectPrefix)) {
    const serverId = Number(customId.slice(IDS.rejectPrefix.length));
    const server = getDb().prepare('SELECT * FROM servers_jeu WHERE server_id = ?').get(serverId);
    if (!server) { await replyEphemeral(interaction, t(guildId, 'config.serveursJeu.notFound')); return true; }
    getDb().prepare('DELETE FROM servers_jeu WHERE server_id = ?').run(serverId);
    await refreshServeursJeuPanel(interaction.guild);
    await refreshServerListPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'servers.rejected', { user: interaction.user.tag }));
    return true;
  }

  return false;
}

module.exports = { seedServeursJeuPanel, refreshServeursJeuPanel, refreshServerListPanel, handleServeursJeuInteraction };
