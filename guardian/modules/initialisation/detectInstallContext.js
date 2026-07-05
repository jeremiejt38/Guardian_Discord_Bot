const { CATEGORIES, GRADE_NAMES } = require('../../config');
const { isGuildInstalled } = require('./checkInstall');
const { findCategoryByName } = require('../utils/channels');
const { setGradeRole, ORDERED_GRADES } = require('./gradeMapping');

const DISCORD_DEFAULT_CHANNELS = new Set([
  'général',
  'general',
  'general-vocal',
  'général-vocal',
  'bienvenue-et-regles',
  'welcome'
]);

function isDefaultDiscordChannel(name) {
  return DISCORD_DEFAULT_CHANNELS.has(String(name || '').toLowerCase().trim());
}

function detectGuardianInstall(guild) {
  return findCategoryByName(guild, CATEGORIES.setup) !== null;
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
