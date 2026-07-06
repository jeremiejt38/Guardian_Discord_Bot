const { saveSanction } = require('./moderation');
const { sendModLog } = require('./modLog');
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const { t } = require('../i18n');

const windows = new Map();

function pruneWindow(now, entries, periodMs) {
  return entries.filter((ts) => now - ts <= periodMs);
}

function isExemptUser(userId, exemptUserIds = []) {
  return Array.isArray(exemptUserIds) && exemptUserIds.includes(userId);
}

function normalizeWord(word) {
  return String(word || '').trim().toLowerCase();
}

function containsBlacklistedWord(content, words = []) {
  const text = String(content || '').toLowerCase();
  return words.map(normalizeWord).filter(Boolean).some((word) => text.includes(word));
}

function evaluateBlacklist(message, options = {}) {
  const {
    words = getGuildSetting(message.guildId, 'automod', 'blacklist_words', []),
    exemptUserIds = getGuildSetting(message.guildId, 'automod', 'exempt_user_ids', [])
  } = options;

  if (isExemptUser(message.author.id, exemptUserIds)) {
    return false;
  }

  return containsBlacklistedWord(message.content, words);
}

function evaluateSpam(message, options = {}) {
  const {
    limitCount = 5,
    periodMs = 3000,
    exemptUserIds = getGuildSetting(message.guildId, 'automod', 'exempt_user_ids', [])
  } = options;

  if (isExemptUser(message.author.id, exemptUserIds)) {
    return false;
  }

  const key = `${message.guildId}:${message.author.id}`;
  const now = Date.now();
  const existing = windows.get(key) || [];
  const recent = pruneWindow(now, existing, periodMs);
  recent.push(now);
  windows.set(key, recent);

  if (recent.length > limitCount) {
    saveSanction({
      guildId: message.guildId,
      userId: message.author.id,
      type: 'warn',
      reason: 'Anti-spam trigger',
      appliedBy: message.client.user.id,
      auto: 1
    });
    sendModLog(message.guild, t(message.guildId, 'modLog.autoModLog', { type: 'warn', userId: message.author.id, reason: 'Anti-spam trigger' })).catch(() => {});
    return true;
  }

  return false;
}

function setSlowModeConfig(guildId, channelId, seconds) {
  const safeSeconds = Math.max(0, Math.min(21600, Number.parseInt(seconds, 10) || 0));
  const config = getGuildSetting(guildId, 'automod', 'slow_mode_channels', {});
  config[channelId] = safeSeconds;
  setGuildSetting(guildId, 'automod', 'slow_mode_channels', config);
  return safeSeconds;
}

function getSlowModeConfig(guildId) {
  return getGuildSetting(guildId, 'automod', 'slow_mode_channels', {});
}

async function applySlowModeToChannel(channel, seconds) {
  const safeSeconds = Math.max(0, Math.min(21600, Number.parseInt(seconds, 10) || 0));
  if (typeof channel?.setRateLimitPerUser !== 'function') {
    return safeSeconds;
  }

  await channel.setRateLimitPerUser(safeSeconds);
  return safeSeconds;
}

async function configureSlowMode(channel, seconds) {
  const applied = await applySlowModeToChannel(channel, seconds);
  setSlowModeConfig(channel.guild.id, channel.id, applied);
  return applied;
}

async function applyPersistedSlowModeForGuild(guild) {
  const config = getSlowModeConfig(guild.id);
  const entries = Object.entries(config);
  for (const [channelId, seconds] of entries) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel || typeof channel.setRateLimitPerUser !== 'function') {
      continue;
    }
    await applySlowModeToChannel(channel, seconds);
  }
}

function getAutoModerationInterfaceModel(guild) {
  const config = getSlowModeConfig(guild.id);
  return guild.channels.cache
    .filter((channel) => channel.isTextBased && channel.isTextBased())
    .map((channel) => ({
      channelId: channel.id,
      channelName: channel.name,
      slowModeSeconds: config[channel.id] || 0,
      enabled: (config[channel.id] || 0) > 0
    }));
}

module.exports = {
  evaluateSpam,
  evaluateBlacklist,
  containsBlacklistedWord,
  configureSlowMode,
  setSlowModeConfig,
  getSlowModeConfig,
  applyPersistedSlowModeForGuild,
  getAutoModerationInterfaceModel,
  isExemptUser
};
