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

async function _handleStep4(guildId, interaction) {
  if (interaction.customId === CUSTOM_IDS.toggleBioRequired) {
    const c = getStep4Config(guildId); c.bioRequired = !c.bioRequired; setStep4Config(guildId, c);
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleSponsorshipRequired) {
    const c = getStep4Config(guildId); c.sponsorshipRequired = !c.sponsorshipRequired; setStep4Config(guildId, c);
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.decreasePromotionDelay) {
    const c = getStep4Config(guildId); c.promotionDelayHours = Math.max(12, c.promotionDelayHours - 12); setStep4Config(guildId, c);
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.increasePromotionDelay) {
    const c = getStep4Config(guildId); c.promotionDelayHours = Math.min(24 * 60, c.promotionDelayHours + 12); setStep4Config(guildId, c);
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.cyclePromotionReviewerGrade) {
    const c = getStep4Config(guildId); c.reviewerGrade = cycleReviewerGrade(c.reviewerGrade); setStep4Config(guildId, c);
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleInviteExpulsion) {
    const c = getStep4Config(guildId); c.inviteExpulsionEnabled = !c.inviteExpulsionEnabled; setStep4Config(guildId, c);
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.decreaseInviteExpulsionDays) {
    const c = getStep4Config(guildId); c.inviteExpulsionDays = Math.max(1, c.inviteExpulsionDays - 1); setStep4Config(guildId, c);
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.increaseInviteExpulsionDays) {
    const c = getStep4Config(guildId); c.inviteExpulsionDays = Math.min(365, c.inviteExpulsionDays + 1); setStep4Config(guildId, c);
    await renderStep(interaction, 4); return true;
  }

  // @premium-start
  // ── Step 4 : Paramètres Discord Community ─────────────────────────────────
  if (interaction.customId === CUSTOM_IDS.applyRulesChannel) {
    await interaction.deferUpdate().catch(() => {});
    const rulesSlot = getGuildSetting(guildId, 'channels', 'rules_channel_id', null);
    const targetId = (rulesSlot && rulesSlot !== 'guardian:create') ? rulesSlot : null;
    if (targetId && interaction.guild) {
      const res = await applyRulesChannel(interaction.guild, targetId);
      await sendSetupMessage(interaction, res.ok
        ? `✅ Canal règles défini sur <#${targetId}> dans les paramètres Discord.`
        : `⚠️ Impossible d\'appliquer le canal règles : ${res.error}`);
    } else {
      await sendSetupMessage(interaction, "⚠️ Aucun channel #règles configuré. Configure le channel à l'étape 3 d'abord.");
    }
    await renderStep(interaction, 4); return true;
  }

  if (interaction.customId === CUSTOM_IDS.applyPublicUpdates) {
    await interaction.deferUpdate().catch(() => {});
    const generalId = getGuildSetting(guildId, 'channels', 'general_channel_id', null);
    const targetId = (generalId && generalId !== 'guardian:create') ? generalId : null;
    if (targetId && interaction.guild) {
      const res = await applyPublicUpdatesChannel(interaction.guild, targetId);
      await sendSetupMessage(interaction, res.ok
        ? `✅ Canal mises à jour défini sur <#${targetId}> dans les paramètres Discord.`
        : `⚠️ Impossible d\'appliquer le canal mises à jour : ${res.error}`);
    } else {
      await sendSetupMessage(interaction, "⚠️ Aucun channel #général configuré. Configure le channel à l'étape 3 d'abord.");
    }
    await renderStep(interaction, 4); return true;
  }

  if (interaction.customId === CUSTOM_IDS.editServerDescription) {
    const currentDesc = getGuildSetting(guildId, 'discord', 'description', interaction.guild?.description ?? '');
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_IDS.serverDescriptionModal)
      .setTitle('Description du serveur')
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('description')
          .setLabel('Description (max 200 caractères)')
          .setStyle(TextInputStyle.Paragraph)
          .setValue(currentDesc || '')
          .setRequired(false)
          .setMaxLength(200)
          .setPlaceholder('Ex: Serveur gaming communautaire dédié aux FPS compétitifs.')
      ));
    await interaction.showModal(modal).catch((err) => logger.warn('showModal failed (serverDescription)', { error: err?.message }));
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId === CUSTOM_IDS.serverDescriptionModal) {
    const desc = interaction.fields.getTextInputValue('description').trim();
    setGuildSetting(guildId, 'discord', 'description', desc || null);
    if (interaction.guild) {
      const res = await applyDescription(interaction.guild, desc);
      if (!res.ok) logger.warn(`applyDescription failed: ${res.error}`);
    }
    await renderStep(interaction, 4); return true;
  }
  // @premium-end

  return false;
}



module.exports = { _handleStep4 };
