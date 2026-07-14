'use strict';

/**
 * tier.js
 * Système de feature flags premium/free par guild.
 * Utilisé dans tous les modules pour gater les fonctionnalités premium.
 *
 * Usage :
 *   const { isPremium } = require('../tier/tier');
 *   if (!isPremium(guildId)) return; // skip premium logic
 */

// @premium-start
const { getGuildTier, setGuildTier } = require('../../database/db');

/**
 * Vérifie si un guild a accès aux features premium.
 * @param {string} guildId
 * @returns {boolean}
 */
function isPremium(guildId) {
  if (process.env.GUARDIAN_PREMIUM_INSTANCE === 'true') return true;
  return getGuildTier(guildId) === 'premium';
}

/**
 * Retourne le tier actuel d'un guild.
 * @param {string} guildId
 * @returns {'free'|'premium'}
 */
function checkTier(guildId) {
  return getGuildTier(guildId);
}

/**
 * Active premium pour un guild avec durée optionnelle.
 * @param {string} guildId
 * @param {number|null} days - Nombre de jours (null = permanent)
 */
function activatePremium(guildId, days = null) {
  const expiresAt = days ? Date.now() + days * 24 * 60 * 60 * 1000 : null;
  setGuildTier(guildId, 'premium', expiresAt);
}

/**
 * Désactive premium pour un guild (repasse en free).
 * @param {string} guildId
 */
function deactivatePremium(guildId) {
  setGuildTier(guildId, 'free', null);
}

/**
 * Retourne la date d'expiration du premium, ou null si permanent/free.
 * @param {string} guildId
 * @returns {Date|null}
 */
function getPremiumExpiry(guildId) {
  const { getDb } = require('../../database/db');
  try {
    const row = getDb().prepare('SELECT expires_at FROM guild_tier WHERE guild_id = ?').get(guildId);
    return row?.expires_at ? new Date(row.expires_at) : null;
  } catch {
    return null;
  }
}

module.exports = {
  isPremium,
  checkTier,
  activatePremium,
  deactivatePremium,
  getPremiumExpiry,
  // Réexport pour éviter les imports multiples
  getGuildTier,
  setGuildTier,
};
// @premium-end
