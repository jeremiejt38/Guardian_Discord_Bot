'use strict';

/**
 * premiumGate.js
 * Utilitaires UX pour les features premium en mode free.
 *
 * - buildPremiumLockButton() : bouton 🔒 visible mais qui déclenche le gate
 * - handlePremiumGateClick() : répond avec un message "Guardian Premium"
 *
 * La fonction handlePremiumGateClick doit rester accessible en mode free
 * (c'est elle qui affiche le message quand l'utilisateur clique 🔒).
 * Le reste du module est premium-only.
 */

const { ButtonBuilder, ButtonStyle } = require('discord.js');
const { replyEphemeral } = require('../utils/interactions');

const GATE_PREFIX = 'premium:gate:';

/**
 * Noms affichables des features premium (pour le message du gate).
 * Doit rester accessible en free (utilisé par handlePremiumGateClick).
 */
const PREMIUM_FEATURE_LABELS = Object.freeze({
  behavior_sanctions: 'Sanctions automatiques sur score comportemental',
  welcome_dm: 'Message de bienvenue personnalisé',
  suggestions_forum: 'Forum de suggestions avec statuts',
  server_list: 'Liste de serveurs communautaire',
  discord_settings: 'Paramètres Discord natifs',
  unlimited_games: 'Jeux illimités (>15)',
  vocal_customization: 'Personnalisation des salons vocaux',
  steam_changelog: 'Changelogs Steam automatiques',
});

/**
 * Vérifie si une interaction est un clic sur un bouton premium gate.
 * @param {import('discord.js').Interaction} interaction
 * @returns {boolean}
 */
function isPremiumGateClick(interaction) {
  return interaction.isButton() && typeof interaction.customId === 'string' && interaction.customId.startsWith(GATE_PREFIX);
}

/**
 * Gère le clic sur un bouton premium gate.
 * Répond avec un message ephemeral expliquant que la feature est premium.
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<boolean>} true si l'interaction a été gérée
 */
async function handlePremiumGateClick(interaction) {
  if (!isPremiumGateClick(interaction)) return false;
  const featureKey = interaction.customId.slice(GATE_PREFIX.length);
  const label = PREMIUM_FEATURE_LABELS[featureKey] ?? 'Cette fonctionnalité';
  await replyEphemeral(
    interaction,
    [
      `🔒 **${label} — Guardian Premium**`,
      '',
      'Cette fonctionnalité est exclusivement disponible dans la version **Guardian Premium**, hébergée et maintenue par le développeur.',
      '',
      '> Pour activer Premium sur votre serveur, contactez-nous sur le serveur Discord officiel.',
    ].join('\n')
  );
  return true;
}

// @premium-start
/**
 * Crée un bouton 🔒 visible, cliquable, qui déclenche le premium gate.
 * @param {string} featureKey - Clé de la feature (cf. PREMIUM_FEATURE_LABELS)
 * @param {string} label - Label affiché sur le bouton
 * @param {ButtonStyle} [style=ButtonStyle.Secondary]
 * @returns {ButtonBuilder}
 */
function buildPremiumLockButton(featureKey, label, style = ButtonStyle.Secondary) {
  return new ButtonBuilder()
    .setCustomId(`${GATE_PREFIX}${featureKey}`)
    .setLabel(`🔒 ${label}`)
    .setStyle(style)
    .setDisabled(false);
}

module.exports = {
  GATE_PREFIX,
  PREMIUM_FEATURE_LABELS,
  isPremiumGateClick,
  handlePremiumGateClick,
  buildPremiumLockButton,
};
// @premium-end
