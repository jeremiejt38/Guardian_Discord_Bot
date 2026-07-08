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

async function _handleStep3(guildId, interaction) {
  if (interaction.customId.startsWith(`${CUSTOM_IDS.channelSelectPrefix}:`)) {
    const slotKey = interaction.customId.split(':').pop();
    const slot = CHANNEL_SLOTS.find((s) => s.key === slotKey);
    if (slot && interaction.values?.[0] && interaction.values[0] !== 'none') {
      setGuildSetting(guildId, slot.settingSection, slot.settingKey, interaction.values[0]);
    }
    const activeSlots = getActiveSlotsForInstall(guildId, interaction.guild);
    const cursor = getChannelCursor(guildId);
    if (cursor < activeSlots.length - 1) setChannelCursor(guildId, cursor + 1);
    await renderStep(interaction, 3); return true;
  }
  if (interaction.customId.startsWith(`${CUSTOM_IDS.channelSkip}:`)) {
    const action = interaction.customId.split(':').pop();
    const activeSlots = getActiveSlotsForInstall(guildId, interaction.guild);
    const cursor = getChannelCursor(guildId);
    if (action === 'prev') { setChannelCursor(guildId, cursor - 1); await renderStep(interaction, 3); return true; }
    if (action === 'skip') { setChannelCursor(guildId, activeSlots.length - 1); await renderStep(interaction, 3); return true; }
    if (action === 'ignore') {
      const slot = activeSlots[cursor];
      if (slot) {
        addIgnoredChannelSlot(guildId, slot.key);
        setGuildSetting(guildId, slot.settingSection, slot.settingKey, null);
        if (slot.key === 'voiceAfk') {
          setGuildSetting(guildId, 'modules', 'afk_enabled', false);
        }
        if (slot.key === 'moderationLogs') {
          setGuildSetting(guildId, 'modules', 'mod_logs_enabled', false);
        }
      }
      if (cursor < activeSlots.length - 1) { setChannelCursor(guildId, cursor + 1); await renderStep(interaction, 3); }
      else { setGuildSetting(guildId, 'setup', 'step', 4); await renderStep(interaction, 4); }
      return true;
    }
    if (action === 'next') {
      if (typeof interaction.guild?.channels?.fetch === 'function') await interaction.guild.channels.fetch().catch(() => {});
      const currentSlot = activeSlots[cursor];
      if (currentSlot) {
        const existingId = getGuildSetting(guildId, currentSlot.settingSection, currentSlot.settingKey, null);
        if (!existingId || existingId === 'guardian:create') {
          setGuildSetting(guildId, currentSlot.settingSection, currentSlot.settingKey, 'guardian:create');
        }
      }
      if (cursor >= activeSlots.length - 1) {
        const generalSlot = activeSlots.find((s) => s.key === 'general');
        const generalId = generalSlot ? getGuildSetting(guildId, generalSlot.settingSection, generalSlot.settingKey, null) : null;
        if (!generalId || generalId === '') {
          const generalIdx = activeSlots.findIndex((s) => s.key === 'general');
          if (generalIdx >= 0) setChannelCursor(guildId, generalIdx);
          await sendSetupMessage(interaction, '⚠️ Le channel **#général** est requis. Associe-le à un channel existant ou laisse Guardian en créer un.');
          await renderStep(interaction, 3);
          return true;
        }
        const nextStep = 4; setGuildSetting(guildId, 'setup', 'step', nextStep); await renderStep(interaction, nextStep);
      }
      else { setChannelCursor(guildId, cursor + 1); await renderStep(interaction, 3); }
      return true;
    }
  }

  return false;
}



module.exports = { _handleStep3 };
