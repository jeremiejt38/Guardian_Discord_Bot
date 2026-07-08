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

async function _handleStep7(guildId, interaction) {
  if (interaction.customId === CUSTOM_IDS.toggleBehaviorScore) {
    const c = getStep7Config(guildId); c.behaviorScoreEnabled = !c.behaviorScoreEnabled; setStep7Config(guildId, c);
    await renderStep(interaction, 7); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleBlacklistWarn) {
    const c = getStep7Config(guildId); c.blacklistWarn = !c.blacklistWarn; setStep7Config(guildId, c);
    await renderStep(interaction, 7); return true;
  }
  if (interaction.customId === CUSTOM_IDS.decreaseSpamThreshold) {
    const c = getStep7Config(guildId); c.spamThreshold = Math.max(2, c.spamThreshold - 1); setStep7Config(guildId, c);
    await renderStep(interaction, 7); return true;
  }
  if (interaction.customId === CUSTOM_IDS.increaseSpamThreshold) {
    const c = getStep7Config(guildId); c.spamThreshold = Math.min(20, c.spamThreshold + 1); setStep7Config(guildId, c);
    await renderStep(interaction, 7); return true;
  }
  if (interaction.customId === CUSTOM_IDS.decreaseSlowMode) {
    const c = getStep7Config(guildId); c.slowModeSeconds = Math.max(0, c.slowModeSeconds - 1); setStep7Config(guildId, c);
    await renderStep(interaction, 7); return true;
  }
  if (interaction.customId === CUSTOM_IDS.increaseSlowMode) {
    const c = getStep7Config(guildId); c.slowModeSeconds = Math.min(120, c.slowModeSeconds + 1); setStep7Config(guildId, c);
    await renderStep(interaction, 7); return true;
  }
  if (interaction.customId === CUSTOM_IDS.cycleLogsLevel) {
    const c = getStep7Config(guildId);
    if (!c.logsEnabled) { c.logsEnabled = true; c.logsLevel = 'minimal'; }
    else { const next = cycleLogsLevel(c.logsLevel); if (next === 'minimal' && c.logsLevel === 'verbose') { c.logsEnabled = false; } else { c.logsLevel = next; } }
    setStep7Config(guildId, c);
    await renderStep(interaction, 7); return true;
  }
  if (interaction.customId === CUSTOM_IDS.addBlacklistWord) {
    const c = getStep7Config(guildId);
    const current = c.blacklistWords.join('\n');
    const modal = new ModalBuilder().setCustomId(CUSTOM_IDS.blacklistModal).setTitle('Mots bannis')
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('words').setLabel('Un mot par ligne (max 50)')
          .setStyle(TextInputStyle.Paragraph).setValue(current).setRequired(false).setMaxLength(500)
      ));
    await interaction.showModal(modal).catch((err) => logger.warn('showModal failed (blacklist)', { error: err?.message })); return true;
  }
  if (interaction.isModalSubmit() && interaction.customId === CUSTOM_IDS.blacklistModal) {
    const raw = interaction.fields.getTextInputValue('words').trim();
    const words = raw ? raw.split('\n').map((w) => w.trim().toLowerCase()).filter(Boolean).slice(0, 50) : [];
    const c = getStep7Config(guildId); c.blacklistWords = words; setStep7Config(guildId, c);
    await renderStep(interaction, 7); return true;
  }
  if (interaction.customId === CUSTOM_IDS.clearBlacklist) {
    const c = getStep7Config(guildId); c.blacklistWords = []; setStep7Config(guildId, c);
    await renderStep(interaction, 7); return true;
  }

  return false;
}



module.exports = { _handleStep7 };
