'use strict';
const ctx = require('./_sharedContext');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle,
  GRADE_NAMES, matchGameFromChannelName, generateNonSteamId, isNonSteamId, GENERIC_CHANNEL_NAMES,
  analyzeNonGuardianRoles, buildSecurityCheckContent, hasUnresolvedIssues,
  getGuildSetting, setGuildSetting, replyEphemeral,
  CUSTOM_IDS, TOTAL_STEPS,
  ORDERED_GRADES, REQUIRED_GRADES, setGradeRole, getGradeMappings, validateStepOneMappings,
  listSetupGames, addSetupGame, removeLastSetupGame, updateSetupGame,
  t, logger,
  CHANNEL_SLOTS, getChannelCursor, setChannelCursor, isCommunityGuild,
  SYSCHANNEL_CHOICES, SYSCHANNEL_LABELS, VOCAL_PREFIX_CYCLE, GAMES_PAGE_SIZE, LOGS_LEVELS,
  GAMELINK_TYPE_LABELS, GAMELINK_LINKABLE_TYPES,
  gradeLabel, getGradeCursor, setGradeCursor, getCurrentStep, boolText, onOff, onOffDot,
  buildNavRow, buildRoleOptions, hasMapableRoles, getRolesAutoCreated, getGradeRenameMap, setGradeRenameName, isFreshInstall,
  _ctx, renderStep, buildStepPayload, sendSetupMessage,
  createRolesAutoHelper, detectDuplicateGradeRoles, autoPositionChannelCursor,
  explainStepOneValidation, advanceToStep2AfterSecurity, buildSecurityComponents,
  getStep2Config, setStep2Config, getActiveSlotsForInstall, autoDetectGuardianChannels,
  buildChannelAutoDetectContent, buildChannelAutoDetectComponents,
  addIgnoredChannelSlot, getIgnoredChannelSlots, buildChannelOptions,
  getStep4Config, setStep4Config, cycleReviewerGrade, getStep4VocalConfig,
  cycleVocalPrefix, formatDelay, getStep5Cursor, setStep5Cursor,
  getGamesPage, setGamesPage, ensureAtLeastOneSetupGame, getSteamCycleValue,
  cycleLogsLevel, getStep7Config, setStep7Config,
  buildCommunityCheckContent, buildCommunityCheckComponents, normalizeChannelName,
  getDetectedGames, setDetectedGames, getGameLinkCursor, setGameLinkCursor,
  getGameLinkActiveType, setGameLinkActiveType, detectExistingGameChannels,
  buildGameDetectContent, buildGameDetectComponents, buildGameReviewContent, buildGameReviewComponents,
  buildGameLinkContent, buildGameLinkComponents,
  buildNotifyMembersContent, buildNotifyMembersComponents, sendInstallNotifyDm,
  semverToInt, getPendingNewOptions, buildNewOptionsContent, buildNewOptionsComponents,
  buildNewOptionsDoneContent, buildNewOptionsDoneRow,
} = require('./_sharedContext');
// @premium-start
const {
  AFK_TIMEOUTS, AFK_TIMEOUT_LABELS, AUTOMOD_RULES,
  syncFromDiscord, getAfkConfig, cycleAfkTimeout, applyAfkSettings,
  getSystemChannelConfig, applySystemChannel, getLocaleConfig, syncLocaleToDiscord,
  applyRulesChannel, applyPublicUpdatesChannel, applyDescription,
  getAutoModConfig, applyAutoModRule, fetchOnboardingState, addOnboardingDefaultChannels,
} = require('../discordSettings');
// @premium-end

async function _handleStep5(guildId, interaction) {
  if (interaction.customId === CUSTOM_IDS.cycleVocalPrefix) {
    const c = getStep4VocalConfig(guildId);
    c.prefix = cycleVocalPrefix(c.prefix);
    setGuildSetting(guildId, 'vocal', 'prefix', c.prefix);
    await renderStep(interaction, 5); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleVocalSuffix) {
    const current = Boolean(getGuildSetting(guildId, 'vocal', 'suffix_enabled', true));
    setGuildSetting(guildId, 'vocal', 'suffix_enabled', !current);
    await renderStep(interaction, 5); return true;
  }
  if (interaction.customId === CUSTOM_IDS.decreaseVocalLimit) {
    const c = getStep4VocalConfig(guildId);
    c.memberLimit = Math.max(0, c.memberLimit - 1);
    setGuildSetting(guildId, 'vocal', 'member_limit', c.memberLimit);
    await renderStep(interaction, 5); return true;
  }
  if (interaction.customId === CUSTOM_IDS.increaseVocalLimit) {
    const c = getStep4VocalConfig(guildId);
    c.memberLimit = Math.min(99, c.memberLimit + 1);
    setGuildSetting(guildId, 'vocal', 'member_limit', c.memberLimit);
    await renderStep(interaction, 5); return true;
  }
  if (interaction.customId === CUSTOM_IDS.decreaseVocalDelay) {
    const c = getStep4VocalConfig(guildId);
    c.deleteDelayMinutes = Math.max(0.5, Math.round((c.deleteDelayMinutes - 0.5) * 2) / 2);
    setGuildSetting(guildId, 'vocal', 'delete_delay_minutes', c.deleteDelayMinutes);
    await renderStep(interaction, 5); return true;
  }
  if (interaction.customId === CUSTOM_IDS.increaseVocalDelay) {
    const c = getStep4VocalConfig(guildId);
    c.deleteDelayMinutes = Math.min(60, Math.round((c.deleteDelayMinutes + 0.5) * 2) / 2);
    setGuildSetting(guildId, 'vocal', 'delete_delay_minutes', c.deleteDelayMinutes);
    await renderStep(interaction, 5); return true;
  }

  return false;
}



module.exports = { _handleStep5 };
