const { getGuildSetting, setGuildSetting } = require('../config/settings');
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { GRADE_NAMES } = require('../../config');
const logger = require('../logs/logger');

/**
 * Notification categories.
 * Each key = category ID stored in DB.
 * enabled: activated by default
 * grades: which grades receive this DM ('owner', 'manager', 'moderateur')
 * critical: shown in red in the panel
 */
const NOTIFICATION_CATEGORIES = Object.freeze({
  bot_update: {
    key: 'bot_update',
    emoji: '🔄',
    labelKey: 'notifications.cat.botUpdate',
    descKey: 'notifications.cat.botUpdateDesc',
    enabled: true,
    critical: true,
    grades: [GRADE_NAMES.owner, GRADE_NAMES.manager]
  },
  bot_error: {
    key: 'bot_error',
    emoji: '🚨',
    labelKey: 'notifications.cat.botError',
    descKey: 'notifications.cat.botErrorDesc',
    enabled: true,
    critical: true,
    grades: [GRADE_NAMES.owner, GRADE_NAMES.manager]
  },
  setup_incomplete: {
    key: 'setup_incomplete',
    emoji: '⚙️',
    labelKey: 'notifications.cat.setupIncomplete',
    descKey: 'notifications.cat.setupIncompleteDesc',
    enabled: true,
    critical: true,
    grades: [GRADE_NAMES.owner]
  },
  moderation_alert: {
    key: 'moderation_alert',
    emoji: '🛡️',
    labelKey: 'notifications.cat.moderationAlert',
    descKey: 'notifications.cat.moderationAlertDesc',
    enabled: true,
    critical: false,
    grades: [GRADE_NAMES.owner, GRADE_NAMES.manager, GRADE_NAMES.moderateur]
  },
  member_join: {
    key: 'member_join',
    emoji: '👋',
    labelKey: 'notifications.cat.memberJoin',
    descKey: 'notifications.cat.memberJoinDesc',
    enabled: false,
    critical: false,
    grades: [GRADE_NAMES.owner, GRADE_NAMES.manager]
  },
  promotion_request: {
    key: 'promotion_request',
    emoji: '📋',
    labelKey: 'notifications.cat.promotionRequest',
    descKey: 'notifications.cat.promotionRequestDesc',
    enabled: false,
    critical: false,
    grades: [GRADE_NAMES.owner, GRADE_NAMES.manager, GRADE_NAMES.moderateur]
  },
  server_status: {
    key: 'server_status',
    emoji: '🖥️',
    labelKey: 'notifications.cat.serverStatus',
    descKey: 'notifications.cat.serverStatusDesc',
    enabled: false,
    critical: false,
    grades: [GRADE_NAMES.owner, GRADE_NAMES.manager]
  },
  steam_update: {
    key: 'steam_update',
    emoji: '🎮',
    labelKey: 'notifications.cat.steamUpdate',
    descKey: 'notifications.cat.steamUpdateDesc',
    enabled: false,
    critical: false,
    grades: [GRADE_NAMES.owner, GRADE_NAMES.manager]
  }
});

/**
 * Returns the notification preferences for a guild.
 * Merges DB overrides with defaults.
 */
function getNotifPrefs(guildId) {
  const prefs = {};
  for (const [key, cat] of Object.entries(NOTIFICATION_CATEGORIES)) {
    const stored = getGuildSetting(guildId, 'notifications', key, null);
    prefs[key] = stored !== null ? Boolean(stored) : cat.enabled;
  }
  return prefs;
}

function setNotifPref(guildId, categoryKey, enabled) {
  setGuildSetting(guildId, 'notifications', categoryKey, enabled ? 1 : 0);
}

/**
 * Returns Discord member objects for a given grade on a guild.
 */
async function getMembersOfGrade(guild, gradeName) {
  const mappings = getGradeMappings(guild.id);
  const roleId = mappings[gradeName];
  if (!roleId) return [];
  const members = await guild.members.fetch().catch(() => null);
  if (!members) return [];
  return members.filter((m) => !m.user.bot && m.roles.cache.has(roleId)).map((m) => m);
}

/**
 * Sends a DM notification to all eligible members for a category.
 * @param {Guild} guild
 * @param {string} categoryKey - key from NOTIFICATION_CATEGORIES
 * @param {string} message - plain text or markdown message to send
 */
async function sendDmNotification(guild, categoryKey, message) {
  const cat = NOTIFICATION_CATEGORIES[categoryKey];
  if (!cat) return;

  const prefs = getNotifPrefs(guild.id);
  if (!prefs[categoryKey]) return;

  const sent = new Set();
  for (const gradeName of cat.grades) {
    const members = await getMembersOfGrade(guild, gradeName);
    for (const member of members) {
      if (sent.has(member.id)) continue;
      sent.add(member.id);
      try {
        await member.send(message);
      } catch {
        logger.warn(`DM notification failed for ${member.user.tag} (${categoryKey})`);
      }
    }
  }
}

module.exports = {
  NOTIFICATION_CATEGORIES,
  getNotifPrefs,
  setNotifPref,
  sendDmNotification
};
