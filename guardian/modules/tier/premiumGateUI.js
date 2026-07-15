'use strict';

/**
 * premiumGateUI.js
 *
 * Utilitaires UI pour afficher un cadenas sur les features premium.
 * Ce fichier doit rester accessible dans les builds free ET premium.
 * Il ne dépend d'aucun module premium.
 */

const { ButtonBuilder, ButtonStyle } = require('discord.js');

const GATE_PREFIX = 'premium:gate:';

/**
 * Indique si le système premium est disponible (build premium) ou non (build free).
 * @returns {boolean}
 */
function isPremiumSystemAvailable() {
  try {
    const tier = require('./tier');
    return typeof tier.isPremium === 'function';
  } catch {
    return false;
  }
}

/**
 * Vérifie si un serveur a accès à une feature premium.
 * En build free, retourne toujours false.
 * En build premium, vérifie isPremium(guildId).
 * @param {string} guildId
 * @returns {boolean}
 */
function isPremiumFeatureEnabled(guildId) {
  if (!isPremiumSystemAvailable()) return false;
  try {
    const { isPremium } = require('./tier');
    return isPremium(guildId);
  } catch {
    return false;
  }
}

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
  isPremiumSystemAvailable,
  isPremiumFeatureEnabled,
  buildPremiumLockButton,
};
