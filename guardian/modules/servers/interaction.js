const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { addServer } = require('./servers');
const { getModerationRoleIds } = require('../../database/db');
const { CHANNELS } = require('../../config');
const { findGuildTextChannelByName } = require('../utils/channels');
const { replyEphemeral } = require('../utils/interactions');
const { memberHasAnyRole } = require('../utils/roles');
const { t } = require('../i18n');

function getServerManagerRoleIds(guildId) {
  const db = getDb();
  return db
    .prepare('SELECT role_id FROM grades WHERE guild_id = ? AND grade_name IN (?, ?, ?)')
    .all(guildId, 'moderateur', 'manager', 'owner')
    .map((r) => r.role_id)
    .filter(Boolean);
}

function memberCanManageServers(interaction) {
  const member = interaction.member;
  if (!member || !interaction.guildId) {
    return false;
  }

  if (interaction.user.id === interaction.guild?.ownerId) {
    return true;
  }

  const perms = interaction.memberPermissions;
  if (perms?.has(PermissionFlagsBits.ManageGuild) || perms?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  const roleCache = member.roles?.cache;
  if (!roleCache?.has) {
    return false;
  }

  return getServerManagerRoleIds(interaction.guildId).some((roleId) => roleCache.has(roleId));
}

async function handleAddServerButton(interaction) {
  const modal = new ModalBuilder().setCustomId('servers:add:modal').setTitle('Ajouter un serveur');

  const name = new TextInputBuilder().setCustomId('server_name').setLabel('Nom du serveur').setStyle(TextInputStyle.Short).setRequired(true);
  const game = new TextInputBuilder().setCustomId('server_game').setLabel('Nom du jeu').setStyle(TextInputStyle.Short).setRequired(true);
  const ip = new TextInputBuilder().setCustomId('server_ip').setLabel('IP ou URL').setStyle(TextInputStyle.Short).setRequired(true);
  const port = new TextInputBuilder().setCustomId('server_port').setLabel('Port').setStyle(TextInputStyle.Short).setRequired(true);
  const pwd = new TextInputBuilder().setCustomId('server_pwd').setLabel('Mot de passe (optionnel)').setStyle(TextInputStyle.Short).setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(name),
    new ActionRowBuilder().addComponents(game),
    new ActionRowBuilder().addComponents(ip),
    new ActionRowBuilder().addComponents(port),
    new ActionRowBuilder().addComponents(pwd)
  );

  await interaction.showModal(modal);
}

async function handleServerModalSubmit(interaction) {
  const guildId = interaction.guildId;
  const name = interaction.fields.getTextInputValue('server_name');
  const game = interaction.fields.getTextInputValue('server_game');
  const ip = interaction.fields.getTextInputValue('server_ip');
  const port = interaction.fields.getTextInputValue('server_port');
  const pwd = interaction.fields.getTextInputValue('server_pwd');

  const modRoles = getModerationRoleIds(guildId);

  const member = interaction.member;
  const isAutoApproved = memberHasAnyRole(member, modRoles);

  const serverId = addServer(guildId, name, game, ip, Number(port), pwd || null, interaction.user.id, isAutoApproved ? 1 : 0);

  if (isAutoApproved) {
    await replyEphemeral(interaction, t(guildId, 'init.serverAdded', { name }));
    return;
  }

  // create proposal message in approve channel
  const approveChannel = findGuildTextChannelByName(interaction.guild, CHANNELS.serveurs);
  const embed = new EmbedBuilder().setTitle(`Proposition de serveur: ${name}`).addFields(
    { name: 'Jeu', value: game, inline: true },
    { name: 'IP:Port', value: `${ip}:${port}`, inline: true }
  );
  if (pwd) embed.addFields({ name: 'Mot de passe', value: pwd, inline: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`servers:approve:${serverId}`).setLabel('Approve').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`servers:reject:${serverId}`).setLabel('Reject').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`servers:connect:${serverId}`).setLabel('Connect').setStyle(ButtonStyle.Secondary)
  );

  if (approveChannel) {
    await approveChannel.send({ embeds: [embed], components: [row] });
  }

  await replyEphemeral(interaction, t(guildId, 'init.serverProposed', { name }));
}

module.exports = { handleAddServerButton, handleServerModalSubmit, memberCanManageServers };
