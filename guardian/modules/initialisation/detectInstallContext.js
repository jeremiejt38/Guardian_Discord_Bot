const { CATEGORIES, GRADE_NAMES } = require('../../config');
const { isGuildInstalled } = require('./checkInstall');
const { findCategoryByName } = require('../utils/channels');
const { setGradeRole, ORDERED_GRADES } = require('./gradeMapping');
const { getGuildSetting } = require('../config/settings');
const logger = require('../logs/logger');

const DISCORD_DEFAULT_CHANNELS = new Set([
  'général',
  'general',
  'general-vocal',
  'général-vocal',
  'bienvenue-et-regles',
  'welcome',
  'salons textuels',
  'text channels',
  'salons vocaux',
  'voice channels',
  'événements',
  'evenements',
  'events',
  'boost'
]);

function isDefaultDiscordChannel(name) {
  return DISCORD_DEFAULT_CHANNELS.has(String(name || '').toLowerCase().trim());
}

function detectGuardianInstall(guild) {
  if (findCategoryByName(guild, CATEGORIES.setup) === null) return false;
  const step = getGuildSetting(guild.id, 'setup', 'step', null);
  return Number.isInteger(step) && step > 1;
}


function getInstallContext(guild) {
  const installed = isGuildInstalled(guild.id);
  logger.debug(`[detectInstallContext] guild=${guild.id} isInstalled=${installed}`);

  if (installed) {
    const freshInstall = getGuildSetting(guild.id, 'setup', 'fresh_install', false);
    const savedStep = Number(getGuildSetting(guild.id, 'setup', 'step', 0));
    if (freshInstall || (savedStep >= 1 && savedStep < 8)) {
      return 'guardian_partial';
    }
    return 'reinstall';
  }

  const hasGuardianSetup = detectGuardianInstall(guild);
  logger.debug(`[detectInstallContext] detectGuardianInstall=${hasGuardianSetup} (looking for category: ${CATEGORIES.setup})`);

  if (hasGuardianSetup) {
    return 'guardian_partial';
  }

  const nonDefaultRoles = guild.roles.cache.filter(
    (role) => role.id !== guild.roles.everyone.id && !role.managed
  );
  const setupCategory = findCategoryByName(guild, CATEGORIES.setup);
  const setupCategoryId = setupCategory?.id ?? null;

  const defaultCategoryIds = new Set(
    guild.channels.cache
      .filter((ch) => ch.type === 4 && ch.position <= 1)
      .map((ch) => ch.id)
  );

  const nonDefaultChannels = guild.channels.cache.filter(
    (ch) =>
      !isDefaultDiscordChannel(ch.name)
      && ch.parentId !== setupCategoryId
      && ch.id !== setupCategoryId
      && !defaultCategoryIds.has(ch.id)
      && !defaultCategoryIds.has(ch.parentId)
  );

  logger.debug(`[detectInstallContext] nonDefaultRoles=${nonDefaultRoles.size} names=[${[...nonDefaultRoles.values()].map(r => r.name).join(', ')}]`);
  logger.debug(`[detectInstallContext] nonDefaultChannels=${nonDefaultChannels.size} names=[${[...nonDefaultChannels.values()].map(c => c.name).join(', ')}]`);

  if (nonDefaultRoles.size > 0 || nonDefaultChannels.size > 0) {
    return 'existing_server';
  }

  return 'fresh';
}

const GRADE_NAME_ALIASES = Object.freeze({
  [GRADE_NAMES.invite]: ['invité', 'invite', 'guest', 'visitor', 'visiteur', 'new'],
  [GRADE_NAMES.membre]: ['membre', 'member', 'membres', 'members'],
  [GRADE_NAMES.moderateur]: ['modérateur', 'moderateur', 'mod', 'moderator', 'modo'],
  [GRADE_NAMES.manager]: ['manager', 'gérant', 'gerant', 'admin', 'administrateur', 'administrator'],
  [GRADE_NAMES.owner]: ['owner', 'propriétaire', 'proprietaire', 'fondateur', 'founder']
});

function normalizeRoleName(name) {
  return String(name || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function autoMapRolesByName(guild) {
  const guildId = guild.id;
  const usedRoleIds = new Set();
  const results = {};

  const sortedRoles = [...guild.roles.cache.values()]
    .filter((r) => r.id !== guild.roles.everyone.id && !r.managed)
    .sort((a, b) => b.position - a.position);

  for (const grade of ORDERED_GRADES) {
    const aliases = GRADE_NAME_ALIASES[grade] || [];
    const match = sortedRoles.find(
      (r) => !usedRoleIds.has(r.id) && aliases.includes(normalizeRoleName(r.name))
    );
    if (match) {
      setGradeRole(guildId, grade, match.id);
      usedRoleIds.add(match.id);
      results[grade] = match.name;
    }
  }

  return results;
}

module.exports = { getInstallContext, autoMapRolesByName };
