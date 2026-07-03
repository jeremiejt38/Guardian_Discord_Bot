const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { getDb } = require('../database/db');
const { GRADE_NAMES } = require('../config');
const { getSanctionsHistory, getBehaviorScore } = require('../modules/moderation/moderation');

const PAGE_SIZE = 10;

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString('fr-FR');
}

function formatEntry(entry) {
  return [
    `Type: ${entry.type}`,
    `Raison: ${entry.reason}`,
    `Date: ${formatDate(entry.timestamp)}`,
    `Applique par: <@${entry.applied_by}>`,
    `Duree: ${entry.duration || '-'}`,
    `Auto: ${entry.auto ? 'oui' : 'non'}`
  ].join('\n');
}

function buildPageEmbed(member, history, page, score) {
  const start = page * PAGE_SIZE;
  const pageEntries = history.slice(start, start + PAGE_SIZE);
  const maxPage = Math.max(Math.ceil(history.length / PAGE_SIZE) - 1, 0);

  const embed = new EmbedBuilder()
    .setTitle(`Historique — ${member.tag}`)
    .setFooter({
      text: `Score comportemental: ${score} • Page ${page + 1}/${maxPage + 1}`
    });

  if (pageEntries.length === 0) {
    embed.setDescription('Aucune sanction enregistree');
    return embed;
  }

  embed.addFields(
    pageEntries.map((entry, index) => ({
      name: `Sanction #${start + index + 1}`,
      value: formatEntry(entry)
    }))
  );

  return embed;
}

function buildPaginationRow(targetUserId, actorId, page, maxPage) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`historique:${targetUserId}:${actorId}:${Math.max(page - 1, 0)}`)
      .setLabel('Precedent')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`historique:${targetUserId}:${actorId}:${Math.min(page + 1, maxPage)}`)
      .setLabel('Suivant')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= maxPage)
  );
}

function hasModeratorAccess(member) {
  const db = getDb();
  const rows = db
    .prepare('SELECT role_id FROM grades WHERE guild_id = ? AND grade_name IN (?, ?, ?)')
    .all(member.guild.id, GRADE_NAMES.moderateur, GRADE_NAMES.manager, GRADE_NAMES.owner);
  const modRoleIds = rows.map((row) => row.role_id).filter(Boolean);

  if (modRoleIds.length > 0) {
    return modRoleIds.some((roleId) => member.roles.cache.has(roleId));
  }

  return member.permissions.has(PermissionFlagsBits.ModerateMembers);
}

async function renderHistorique(interaction, targetUserId, actorId, page) {
  if (interaction.user.id !== actorId) {
    await interaction.reply({
      content: 'Tu ne peux pas manipuler cette pagination.',
      ephemeral: true
    });
    return;
  }

  const targetUser = await interaction.client.users.fetch(targetUserId);
  const history = getSanctionsHistory(interaction.guildId, targetUserId);
  const score = getBehaviorScore(interaction.guildId, targetUserId);
  const maxPage = Math.max(Math.ceil(history.length / PAGE_SIZE) - 1, 0);
  const safePage = Math.min(Math.max(page, 0), maxPage);
  const embed = buildPageEmbed(targetUser, history, safePage, score);
  const components = history.length > PAGE_SIZE
    ? [buildPaginationRow(targetUserId, actorId, safePage, maxPage)]
    : [];

  if (interaction.isButton()) {
    await interaction.update({ embeds: [embed], components });
    return;
  }

  await interaction.reply({ embeds: [embed], components, ephemeral: true });
}

async function handleHistoriquePagination(interaction) {
  const [, targetUserId, actorId, pageRaw] = interaction.customId.split(':');
  const page = Number.parseInt(pageRaw, 10);
  await renderHistorique(interaction, targetUserId, actorId, Number.isNaN(page) ? 0 : page);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historique')
    .setDescription('Historique des sanctions d\'un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre ciblé').setRequired(true)),
  async execute(interaction) {
    const actorMember = await interaction.guild.members.fetch(interaction.user.id);
    if (!hasModeratorAccess(actorMember)) {
      await interaction.reply({
        content: 'Commande reservee a Moderateur+.',
        ephemeral: true
      });
      return;
    }

    const member = interaction.options.getUser('membre', true);
    await renderHistorique(interaction, member.id, interaction.user.id, 0);
  },
  handleHistoriquePagination
};
