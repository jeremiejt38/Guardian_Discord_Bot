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

async function _handleStep2(guildId, interaction) {
  if (interaction.customId === CUSTOM_IDS.toggleSuggestions) {
    const c = getStep2Config(guildId); c.suggestionsEnabled = !c.suggestionsEnabled; setStep2Config(guildId, c);
    await renderStep(interaction, 2); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleServerList) {
    const c = getStep2Config(guildId); c.serverListEnabled = !c.serverListEnabled; setStep2Config(guildId, c);
    await renderStep(interaction, 2); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleStatusBot) {
    const c = getStep2Config(guildId); c.statusBotEnabled = !c.statusBotEnabled; setStep2Config(guildId, c);
    await renderStep(interaction, 2); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleAfk) {
    const c = getStep2Config(guildId); c.afkEnabled = !c.afkEnabled; setStep2Config(guildId, c);
    await renderStep(interaction, 2); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleGameUpdates) {
    const c = getStep2Config(guildId); c.gameUpdatesEnabled = !c.gameUpdatesEnabled; setStep2Config(guildId, c);
    await renderStep(interaction, 2); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleGuides) {
    const c = getStep2Config(guildId); c.guidesEnabled = !c.guidesEnabled; setStep2Config(guildId, c);
    await renderStep(interaction, 2); return true;
  }

  // @premium-start
  // ── Step 2 : Paramètres Discord natifs ────────────────────────────────────────
  if (interaction.customId === CUSTOM_IDS.cycleAfkTimeout) {
    const afkCfg = getAfkConfig(guildId, interaction.guild);
    const next = cycleAfkTimeout(afkCfg.timeout);
    setGuildSetting(guildId, 'discord', 'afk_timeout', next);
    const c = getStep2Config(guildId);
    if (c.afkEnabled && interaction.guild) {
      await applyAfkSettings(interaction.guild, afkCfg.channelId, next);
    }
    await renderStep(interaction, 2); return true;
  }

  if (interaction.customId === CUSTOM_IDS.cycleSystemChannel) {
    const next = SYSCHANNEL_CHOICES[(SYSCHANNEL_CHOICES.indexOf(getGuildSetting(guildId, 'discord', 'system_channel_choice', 'keep')) + 1) % SYSCHANNEL_CHOICES.length];
    setGuildSetting(guildId, 'discord', 'system_channel_choice', next);
    if (interaction.guild) {
      if (next === 'disabled') {
        await applySystemChannel(interaction.guild, null);
      } else if (next === 'general') {
        const generalId = getGuildSetting(guildId, 'channels', 'general_channel_id', null);
        if (generalId && generalId !== 'guardian:create') await applySystemChannel(interaction.guild, generalId);
      }
      // 'keep' = ne rien changer
    }
    await renderStep(interaction, 2); return true;
  }

  if (interaction.customId === CUSTOM_IDS.syncLocale) {
    const { getGuildLanguage: _ggl } = require('../i18n');
    const lang = _ggl(guildId);
    if (interaction.guild) await syncLocaleToDiscord(interaction.guild, lang);
    await renderStep(interaction, 2); return true;
  }
  // @premium-end

  return false;
}



module.exports = { _handleStep2 };
