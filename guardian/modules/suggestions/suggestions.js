'use strict';

/**
 * suggestions.js
 * Module de gestion du forum de suggestions avec statuts — feature premium.
 *
 * Fonctionnement :
 * - À la création d'un thread dans le forum suggestions → tag "En attente" ajouté auto
 * - Boutons de gestion du statut : En attente / En cours / Acceptée / Rejetée
 * - Réservé aux roles owner/manager pour changer le statut
 *
 * Usage :
 *   const { handleNewSuggestionThread, handleSuggestionInteraction } = require('./suggestions');
 */

// @premium-start
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CHANNELS, GRADE_NAMES } = require('../../config');
const { getGuildSetting } = require('../config/settings');
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { isPremium } = require('../tier/tier');
const logger = require('../logs/logger');

const STATUSES = Object.freeze({
  pending: { label: '⏳ En attente', emoji: '⏳', style: ButtonStyle.Secondary },
  inprogress: { label: '🔄 En cours', emoji: '🔄', style: ButtonStyle.Primary },
  accepted: { label: '✅ Acceptée', emoji: '✅', style: ButtonStyle.Success },
  rejected: { label: '❌ Rejetée', emoji: '❌', style: ButtonStyle.Danger },
});

const STATUS_KEYS = Object.keys(STATUSES);

const IDS = Object.freeze({
  statusPrefix: 'suggestions:status:',
});

/**
 * Construit le customId d'un bouton de statut.
 * @param {string} status
 * @param {string} threadId
 * @returns {string}
 */
function buildStatusCustomId(status, threadId) {
  return `${IDS.statusPrefix}${status}:${threadId}`;
}

/**
 * Vérifie si un membre a le grade owner ou manager.
 * @param {import('discord.js').GuildMember} member
 * @param {string} guildId
 * @returns {boolean}
 */
function canManageSuggestions(member, guildId) {
  const mappings = getGradeMappings(guildId);
  const ownerRoleId = mappings[GRADE_NAMES.owner];
  const managerRoleId = mappings[GRADE_NAMES.manager];
  return (
    (ownerRoleId && member.roles.cache.has(ownerRoleId)) ||
    (managerRoleId && member.roles.cache.has(managerRoleId))
  );
}

/**
 * Construit la rangée de boutons de statut pour un thread.
 * @param {string} threadId
 * @param {string} [currentStatus]
 * @returns {ActionRowBuilder}
 */
function buildStatusRow(threadId, currentStatus = 'pending') {
  const buttons = STATUS_KEYS.map((key) => {
    const s = STATUSES[key];
    return new ButtonBuilder()
      .setCustomId(buildStatusCustomId(key, threadId))
      .setLabel(s.label)
      .setStyle(s.style)
      .setDisabled(key === currentStatus);
  });
  return new ActionRowBuilder().addComponents(...buttons);
}

/**
 * Vérifie si un thread appartient au forum suggestions du guild.
 * @param {import('discord.js').ThreadChannel} thread
 * @returns {boolean}
 */
function isSuggestionThread(thread) {
  const parent = thread.parent;
  if (!parent) return false;
  const suggestionsEnabled = getGuildSetting(thread.guildId, 'channels', 'suggestions_enabled', true);
  if (!suggestionsEnabled) return false;
  return parent.name?.toLowerCase() === CHANNELS.suggestions?.toLowerCase();
}

/**
 * Gère la création d'un nouveau thread dans le forum suggestions.
 * Envoie un message de contrôle avec les boutons de statut.
 * @param {import('discord.js').ThreadChannel} thread
 * @returns {Promise<void>}
 */
async function handleNewSuggestionThread(thread) {
  if (!isPremium(thread.guildId)) return;
  if (!isSuggestionThread(thread)) return;

  try {
    const row = buildStatusRow(thread.id, 'pending');
    await thread.send({
      content: [
        `📋 **Gestion de la suggestion** — *réservé aux modérateurs*`,
        `> Utilisez les boutons ci-dessous pour mettre à jour le statut de cette suggestion.`,
        `> Statut actuel : ${STATUSES.pending.label}`,
      ].join('\n'),
      components: [row],
    });
  } catch (err) {
    logger.warn('handleNewSuggestionThread: failed to send status message', { error: err?.message });
  }
}

/**
 * Gère les interactions sur les boutons de statut des suggestions.
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<boolean>}
 */
async function handleSuggestionInteraction(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId?.startsWith(IDS.statusPrefix)) return false;

  const guildId = interaction.guildId;

  if (!isPremium(guildId)) {
    await interaction.reply({ content: '🔒 Cette feature est disponible en **Guardian Premium** uniquement.', ephemeral: true });
    return true;
  }

  if (!canManageSuggestions(interaction.member, guildId)) {
    await interaction.reply({ content: '❌ Seuls les modérateurs peuvent gérer les suggestions.', ephemeral: true });
    return true;
  }

  const parts = interaction.customId.slice(IDS.statusPrefix.length).split(':');
  const newStatus = parts[0];
  const threadId = parts.slice(1).join(':');

  if (!STATUS_KEYS.includes(newStatus)) return false;

  const statusInfo = STATUSES[newStatus];
  const row = buildStatusRow(threadId, newStatus);

  try {
    await interaction.update({
      content: [
        `📋 **Gestion de la suggestion** — *réservé aux modérateurs*`,
        `> Utilisez les boutons ci-dessous pour mettre à jour le statut de cette suggestion.`,
        `> Statut actuel : ${statusInfo.label}`,
        `> Mis à jour par <@${interaction.user.id}>`,
      ].join('\n'),
      components: [row],
    });

    const thread = interaction.channel;
    if (thread?.isThread?.()) {
      const parent = thread.parent;
      if (parent?.availableTags?.length > 0) {
        const matchingTag = parent.availableTags.find(
          (tag) => tag.emoji?.name === statusInfo.emoji || tag.name?.toLowerCase().includes(newStatus)
        );
        if (matchingTag) {
          await thread.setAppliedTags([matchingTag.id]).catch(() => {});
        }
      }
    }
  } catch (err) {
    logger.warn('handleSuggestionInteraction: update failed', { error: err?.message });
  }

  return true;
}

module.exports = {
  handleNewSuggestionThread,
  handleSuggestionInteraction,
  isSuggestionThread,
  buildStatusRow,
  canManageSuggestions,
  STATUSES,
  STATUS_KEYS,
  IDS,
};
// @premium-end
