'use strict';

/**
 * welcomeMessage.js
 * Message de bienvenue personnalisé en DM — feature premium.
 *
 * Variables disponibles dans le template :
 *   {name}    → displayName du membre
 *   {server}  → nom du serveur
 *   {delay}   → délai de promotion en heures
 *   {grade}   → grade actuel assigné
 *
 * Usage :
 *   const { renderWelcomeTemplate, getWelcomeMessage, setWelcomeMessage } = require('./welcomeMessage');
 */

// @premium-start
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const { isPremium } = require('../tier/tier');

const SETTING_SECTION = 'members';
const SETTING_KEY = 'welcome_message';

const VARIABLES = Object.freeze(['name', 'server', 'delay', 'grade']);

const DEFAULT_TEMPLATE = null;

/**
 * Récupère le template de bienvenue personnalisé du guild.
 * @param {string} guildId
 * @returns {string|null}
 */
function getWelcomeMessage(guildId) {
  return getGuildSetting(guildId, SETTING_SECTION, SETTING_KEY, DEFAULT_TEMPLATE);
}

/**
 * Définit le template de bienvenue personnalisé.
 * @param {string} guildId
 * @param {string|null} template
 */
function setWelcomeMessage(guildId, template) {
  setGuildSetting(guildId, SETTING_SECTION, SETTING_KEY, template || null);
}

/**
 * Interpole les variables dans un template de bienvenue.
 * @param {string} template
 * @param {object} vars - { name, server, delay, grade }
 * @returns {string}
 */
function renderWelcomeTemplate(template, vars = {}) {
  if (!template || typeof template !== 'string') return template ?? '';
  let result = template;
  for (const key of VARIABLES) {
    const value = vars[key] != null ? String(vars[key]) : '';
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

/**
 * Construit le DM de bienvenue pour un membre.
 * Si premium + template configuré → utilise le template.
 * Sinon → retourne null (le DM par défaut sera envoyé par newMember.js).
 *
 * @param {import('discord.js').GuildMember} member
 * @param {string} guildId
 * @param {object} opts - { grade, delayHours }
 * @returns {string|null}
 */
function buildCustomWelcomeDm(member, guildId, opts = {}) {
  if (!isPremium(guildId)) return null;
  const template = getWelcomeMessage(guildId);
  if (!template) return null;

  const vars = {
    name: member.displayName ?? member.user?.username ?? '',
    server: member.guild?.name ?? '',
    delay: opts.delayHours ?? 48,
    grade: opts.grade ?? 'Invité',
  };

  return renderWelcomeTemplate(template, vars);
}

/**
 * Envoie le DM de bienvenue personnalisé si applicable.
 * Retourne true si un DM custom a été envoyé, false sinon.
 * @param {import('discord.js').GuildMember} member
 * @param {string} guildId
 * @param {object} opts - { grade, delayHours }
 * @returns {Promise<boolean>}
 */
async function maybeSendCustomWelcomeDm(member, guildId, opts = {}) {
  const content = buildCustomWelcomeDm(member, guildId, opts);
  if (!content) return false;
  try {
    await member.send(content);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getWelcomeMessage,
  setWelcomeMessage,
  renderWelcomeTemplate,
  buildCustomWelcomeDm,
  maybeSendCustomWelcomeDm,
  VARIABLES,
};
// @premium-end
