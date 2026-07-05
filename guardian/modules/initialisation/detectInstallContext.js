const { CATEGORIES, CHANNELS } = require('../../config');
const { isGuildInstalled } = require('./checkInstall');
const { findCategoryByName, findGuildTextChannelByName } = require('../utils/channels');

const DISCORD_DEFAULT_CHANNELS = new Set([
  'général',
  'general',
  'general-vocal',
  'général-vocal',
  'bienvenue-et-regles',
  'welcome'
]);

const GUARDIAN_CHANNEL_NAMES = new Set(Object.values(CHANNELS));
const GUARDIAN_CATEGORY_NAMES = new Set(Object.values(CATEGORIES));

function isDefaultDiscordChannel(name) {
  return DISCORD_DEFAULT_CHANNELS.has(String(name || '').toLowerCase().trim());
}

function detectGuardianInstall(guild) {
  return GUARDIAN_CATEGORY_NAMES.has
    ? [...GUARDIAN_CATEGORY_NAMES].some((catName) => findCategoryByName(guild, catName) !== null)
    : false;
}

function detectExistingStructure(guild) {
  const nonDefaultRoles = guild.roles.cache.filter(
    (role) => role.id !== guild.roles.everyone.id && !role.managed
  );

  const nonDefaultChannels = guild.channels.cache.filter(
    (ch) => !isDefaultDiscordChannel(ch.name)
  );

  return nonDefaultRoles.size > 0 || nonDefaultChannels.size > 0;
}

function getInstallContext(guild) {
  if (isGuildInstalled(guild.id)) {
    return 'reinstall';
  }

  if (detectGuardianInstall(guild)) {
    return 'guardian_partial';
  }

  if (detectExistingStructure(guild)) {
    return 'existing_server';
  }

  return 'fresh';
}

module.exports = { getInstallContext };
