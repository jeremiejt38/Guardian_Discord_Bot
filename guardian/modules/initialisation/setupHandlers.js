'use strict';

/**
 * setupHandlers.js
 * Sous-handlers et dispatcher extraits de setupFlow.js.
 */
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, StringSelectMenuBuilder,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { GRADE_NAMES } = require('../../config');
const { matchGameFromChannelName, generateNonSteamId, isNonSteamId, GENERIC_CHANNEL_NAMES } = require('../games/steamGamesList');
const { analyzeNonGuardianRoles, buildSecurityCheckContent, hasUnresolvedIssues } = require('./roleSecurityCheck');
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const { replyEphemeral } = require('../utils/interactions');
const { CUSTOM_IDS, TOTAL_STEPS } = require('./setupConstants');
const { ORDERED_GRADES, REQUIRED_GRADES, setGradeRole, getGradeMappings, validateStepOneMappings } = require('./gradeMapping');
const { listSetupGames, addSetupGame, removeLastSetupGame, updateSetupGame } = require('./setupGames');
const { t } = require('../../locales');
const logger = require('../logs/logger');
// @premium-start
const {
  AFK_TIMEOUTS, AFK_TIMEOUT_LABELS, AUTOMOD_RULES,
  syncFromDiscord, getAfkConfig, cycleAfkTimeout, applyAfkSettings,
  getSystemChannelConfig, applySystemChannel, getLocaleConfig, syncLocaleToDiscord,
  applyRulesChannel, applyPublicUpdatesChannel, applyDescription,
  getAutoModConfig, applyAutoModRule, fetchOnboardingState, addOnboardingDefaultChannels,
} = require('./discordSettings');
// @premium-end

const _s = require('./setupSteps');
const _gd = require('./setupGamesDetect');
const _gr = require('./setupGrades');
const _sec = require('./setupSecurity');
const _notif = require('./setupNotifications');
const _render = require('./setupRender');

const { CHANNEL_SLOTS, getChannelCursor, setChannelCursor, isCommunityGuild, SYSCHANNEL_CHOICES, SYSCHANNEL_LABELS, VOCAL_PREFIX_CYCLE, GAMES_PAGE_SIZE, LOGS_LEVELS } = _s;
const { GAMELINK_TYPE_LABELS, GAMELINK_LINKABLE_TYPES } = _gd;

const gradeLabel = (g) => _gr.gradeLabel(g);
const getGradeCursor = (guildId) => _gr.getGradeCursor(guildId);
const setGradeCursor = (guildId, c) => _gr.setGradeCursor(guildId, c);
const getCurrentStep = (guildId) => _gr.getCurrentStep(guildId);
const boolText = (v, gid) => _gr.boolText(v, gid);
const onOff = (f) => _gr.onOff(f);
const onOffDot = (f) => _gr.onOffDot(f);
const buildNavRow = (guildId, step) => _gr.buildNavRow(guildId, step);
const buildRoleOptions = (guild, id) => _gr.buildRoleOptions(guild, id);
const hasMapableRoles = (guild) => _gr.hasMapableRoles(guild);
const getRolesAutoCreated = (guildId) => _gr.getRolesAutoCreated(guildId);
const getGradeRenameMap = (guildId) => _gr.getGradeRenameMap(guildId);
const setGradeRenameName = (guildId, grade, name) => _gr.setGradeRenameName(guildId, grade, name);
const isFreshInstall = (guildId) => _gr.isFreshInstall(guildId);

function _ctx() {
  return {
    CUSTOM_IDS, TOTAL_STEPS, CHANNEL_SLOTS,
    gradeLabel, buildNavRow, buildRoleOptions,
    getGradeCursor, getRolesAutoCreated, hasMapableRoles, getGradeRenameMap,
    isCommunityGuild, getChannelCursor, isFreshInstall,
    onOff, onOffDot,
  };
}

const renderStep = (interaction, step) => _render.renderStep(interaction, step, _ctx());
const buildStepPayload = (guildId, guild, step) => _render.buildStepPayload(guildId, guild, step, _ctx());
const sendSetupMessage = (interaction, content) => _render.sendSetupMessage(interaction, content);
const createRolesAutoHelper = (interaction, guild, guildId) => _gr.createRolesAutoHelper(interaction, guild, guildId, renderStep);
const detectDuplicateGradeRoles = (guild) => _gr.detectDuplicateGradeRoles(guild);
const autoPositionChannelCursor = (guildId, guild) => _gr.autoPositionChannelCursor(guildId, guild);
const explainStepOneValidation = (guildId, v) => _sec.explainStepOneValidation(guildId, v, gradeLabel);
const advanceToStep2AfterSecurity = (interaction, guildId) => _sec.advanceToStep2AfterSecurity(interaction, guildId, buildStepPayload);
const buildSecurityComponents = (d, u, _, r) => _sec.buildSecurityComponents(d, u, _, r);
const getStep2Config = (guildId) => _s.getStep2Config(guildId);
const setStep2Config = (guildId, c) => _s.setStep2Config(guildId, c);
const getActiveSlotsForInstall = (guildId, guild) => _s.getActiveSlotsForInstall(guildId, guild, CHANNEL_SLOTS, isCommunityGuild);
const autoDetectGuardianChannels = (guild) => _s.autoDetectGuardianChannels(guild, CHANNEL_SLOTS);
const buildChannelAutoDetectContent = (guildId, guild) => _s.buildChannelAutoDetectContent(guildId, guild, _ctx());
const buildChannelAutoDetectComponents = () => _s.buildChannelAutoDetectComponents(CUSTOM_IDS);
const addIgnoredChannelSlot = (guildId, k) => _s.addIgnoredChannelSlot(guildId, k);
const getIgnoredChannelSlots = (guildId) => _s.getIgnoredChannelSlots(guildId);
const buildChannelOptions = (guild, slot) => _s.buildChannelOptions(guild, slot);
const getStep4Config = (guildId, guild) => _s.getStep4Config(guildId, guild);
const setStep4Config = (guildId, c) => _s.setStep4Config(guildId, c);
const cycleReviewerGrade = (g) => _s.cycleReviewerGrade(g);
const getStep4VocalConfig = (guildId) => _s.getStep4VocalConfig(guildId);
const cycleVocalPrefix = (c) => _s.cycleVocalPrefix(c);
const formatDelay = (m) => _s.formatDelay(m);
const getStep5Cursor = (guildId) => _s.getStep5Cursor(guildId);
const setStep5Cursor = (guildId, c) => _s.setStep5Cursor(guildId, c);
const getGamesPage = (guildId) => _s.getGamesPage(guildId);
const setGamesPage = (guildId, p) => _s.setGamesPage(guildId, p);
const ensureAtLeastOneSetupGame = (guildId) => _s.ensureAtLeastOneSetupGame(guildId);
const getSteamCycleValue = (v) => _s.getSteamCycleValue(v);
const cycleLogsLevel = (c) => _s.cycleLogsLevel(c);
const getStep7Config = (guildId) => _s.getStep7Config(guildId);
const setStep7Config = (guildId, c) => _s.setStep7Config(guildId, c);
const buildCommunityCheckContent = (guildId, guild) => _s.buildCommunityCheckContent(guildId, guild, _ctx());
const buildCommunityCheckComponents = () => _s.buildCommunityCheckComponents(CUSTOM_IDS);
const normalizeChannelName = (name) => _s.normalizeChannelName(name);
const getDetectedGames = (guildId) => _gd.getDetectedGames(guildId);
const setDetectedGames = (guildId, g) => _gd.setDetectedGames(guildId, g);
const getGameLinkCursor = (guildId) => _gd.getGameLinkCursor(guildId);
const setGameLinkCursor = (guildId, v) => _gd.setGameLinkCursor(guildId, v);
const getGameLinkActiveType = (guildId) => _gd.getGameLinkActiveType(guildId);
const setGameLinkActiveType = (guildId, tp) => _gd.setGameLinkActiveType(guildId, tp);
const detectExistingGameChannels = (guild) => _gd.detectExistingGameChannels(guild);
const buildGameDetectContent = (guildId, guild) => _gd.buildGameDetectContent(guildId, guild, TOTAL_STEPS);
const buildGameDetectComponents = (guild) => _gd.buildGameDetectComponents(guild, CUSTOM_IDS);
const buildGameReviewContent = (guildId) => _gd.buildGameReviewContent(guildId);
const buildGameReviewComponents = (guildId) => _gd.buildGameReviewComponents(guildId, CUSTOM_IDS);
const buildGameLinkContent = (guildId) => _gd.buildGameLinkContent(guildId);
const buildGameLinkComponents = (guildId, guild) => _gd.buildGameLinkComponents(guildId, guild, CUSTOM_IDS, buildNavRow);
const buildNotifyMembersContent = (guildId) => _notif.buildNotifyMembersContent(guildId);
const buildNotifyMembersComponents = () => _notif.buildNotifyMembersComponents(CUSTOM_IDS);
const sendInstallNotifyDm = (member, guildId) => _notif.sendInstallNotifyDm(member, guildId);
const semverToInt = (v) => _notif.semverToInt(v);
const getPendingNewOptions = (guildId, guild) => _notif.getPendingNewOptions(guildId, guild, CHANNEL_SLOTS, getActiveSlotsForInstall);
const buildNewOptionsContent = (guildId, guild) => _notif.buildNewOptionsContent(guildId, guild, CHANNEL_SLOTS, getActiveSlotsForInstall);
const buildNewOptionsComponents = (guildId, guild) => _notif.buildNewOptionsComponents(guildId, guild, CUSTOM_IDS, CHANNEL_SLOTS, getActiveSlotsForInstall);
const buildNewOptionsDoneContent = () => _notif.buildNewOptionsDoneContent();
const buildNewOptionsDoneRow = () => _notif.buildNewOptionsDoneRow(CUSTOM_IDS);

// ─── Sous-handler : Step 1 — Grades ─────────────────────────────────────────

async function _handleStep1(guildId, interaction) {
  if (interaction.customId === CUSTOM_IDS.previousGrade) {
    setGradeCursor(guildId, getGradeCursor(guildId) - 1);
    await renderStep(interaction, 1);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.nextGrade) {
    setGradeCursor(guildId, getGradeCursor(guildId) + 1);
    await renderStep(interaction, 1);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.cycleInviteMode) {
    const sequence = ['classic', 'strict', 'direct'];
    const current = getGuildSetting(guildId, 'setup', 'invite_mode', 'classic');
    const next = sequence[(sequence.indexOf(current) + 1) % sequence.length];
    setGuildSetting(guildId, 'setup', 'invite_mode', next);
    await renderStep(interaction, 1);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.createRolesAll) {
    await interaction.deferUpdate().catch(() => {});
    await createRolesAutoHelper(interaction, interaction.guild, guildId);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.createRolesAuto) {
    await interaction.deferUpdate().catch(() => {});
    const guild = interaction.guild;
    const cursor = getGradeCursor(guildId);
    const grade = ORDERED_GRADES[cursor];
    if (!grade) {
      await renderStep(interaction, 1);
      return true;
    }
    const label = gradeLabel(grade).toLowerCase();
    const existing = guild?.roles?.cache
      ? [...guild.roles.cache.values()].find(
          (r) => r.name.toLowerCase() === label && !r.managed && r.id !== guild.roles.everyone?.id
        )
      : null;
    if (existing) {
      const warnContent = [
        `⚠️ **Un rôle « ${gradeLabel(grade)} » existe déjà sur ce serveur.**`,
        `> Rôle concerné : <@&${existing.id}>`,
        '',
        '**Que voulez-vous faire ?**',
        '> 🔗 **Transférer** — Guardian utilise ce rôle existant et conserve les membres déjà assignés.',
        '> 🗑️ **Recréer** — Guardian supprime ce rôle et en crée un nouveau (les membres perdent ce rôle).'
      ].join('\n');
      const warnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_IDS.transferExistingRoles}:${grade}`)
          .setStyle(ButtonStyle.Primary)
          .setLabel('🔗 Transférer'),
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_IDS.recreateRoles}:${grade}`)
          .setStyle(ButtonStyle.Danger)
          .setLabel('🗑️ Recréer')
      );
      await interaction.message.edit({ content: warnContent, components: [warnRow] }).catch(async () => {
        await interaction.channel?.send({ content: warnContent, components: [warnRow] });
      });
      return true;
    }
    const roleColors = {
      [GRADE_NAMES.invite]: 0x95a5a6,
      [GRADE_NAMES.membre]: 0x3498db,
      [GRADE_NAMES.moderateur]: 0x2ecc71,
      [GRADE_NAMES.manager]: 0xe67e22,
      [GRADE_NAMES.owner]: 0xe74c3c
    };
    try {
      const role = await guild.roles.create({
        name: gradeLabel(grade),
        color: roleColors[grade] ?? 0x99aab5,
        reason: 'Guardian setup — création automatique des rôles'
      });
      setGradeRole(guildId, grade, role.id);
    } catch (err) {
      logger.error(`Failed to create role for grade ${grade}`, err);
    }
    const nextCursor = cursor + 1;
    if (nextCursor >= ORDERED_GRADES.length) {
      setGuildSetting(guildId, 'setup', 'roles_auto_created', true);
      setGuildSetting(guildId, 'setup', 'fresh_install', false);
      setGradeCursor(guildId, 0);
      try {
        const ownerRoleId = getGradeMappings(guildId)[GRADE_NAMES.owner];
        const ownerRole = ownerRoleId && guild.roles.cache.get(ownerRoleId);
        const botMember = guild.members.me;
        const botRole = botMember?.roles?.botRole;
        if (ownerRole && botRole && botRole.position <= ownerRole.position) {
          await guild.roles.setPositions([
            { role: botRole.id, position: ownerRole.position + 1 }
          ]).catch((err) => logger.warn(`[setup] Failed to reposition bot role: ${err?.message}`));
        }
      } catch (err) {
        logger.warn(`[setup] Failed to reposition bot role: ${err?.message}`);
      }
    } else {
      setGradeCursor(guildId, nextCursor);
    }
    if (typeof guild.roles?.fetch === 'function') await guild.roles.fetch().catch(() => {});
    await renderStep(interaction, 1);
    return true;
  }

  if (interaction.customId.startsWith(CUSTOM_IDS.transferExistingRoles)) {
    await interaction.deferUpdate().catch(() => {});
    const guild = interaction.guild;
    const grade = interaction.customId.includes(':') ? interaction.customId.split(':').pop() : null;
    if (grade && ORDERED_GRADES.includes(grade)) {
      const label = gradeLabel(grade).toLowerCase();
      const existing = guild?.roles?.cache
        ? [...guild.roles.cache.values()].find(
            (r) => r.name.toLowerCase() === label && !r.managed && r.id !== guild.roles.everyone?.id
          )
        : null;
      if (existing) {
        setGradeRole(guildId, grade, existing.id);
        const roleColors = {
          [GRADE_NAMES.invite]: 0x95a5a6,
          [GRADE_NAMES.membre]: 0x3498db,
          [GRADE_NAMES.moderateur]: 0x2ecc71,
          [GRADE_NAMES.manager]: 0xe67e22,
          [GRADE_NAMES.owner]: 0xe74c3c
        };
        const currentColor = existing.color;
        if (currentColor === 0 || currentColor === 0xffffff) {
          await existing.edit({ color: roleColors[grade] ?? 0x99aab5 }).catch((err) =>
            logger.warn(`[setup] Could not set color for role ${existing.name}: ${err?.message}`)
          );
        }
      }
      const cursor = getGradeCursor(guildId);
      const nextCursor = cursor + 1;
      if (nextCursor >= ORDERED_GRADES.length) {
        setGuildSetting(guildId, 'setup', 'roles_auto_created', true);
        setGuildSetting(guildId, 'setup', 'fresh_install', false);
        setGradeCursor(guildId, 0);
      } else {
        setGradeCursor(guildId, nextCursor);
      }
    }
    await renderStep(interaction, 1);
    return true;
  }

  if (interaction.customId.startsWith(CUSTOM_IDS.recreateRoles)) {
    await interaction.deferUpdate().catch(() => {});
    const guild = interaction.guild;
    const grade = interaction.customId.includes(':') ? interaction.customId.split(':').pop() : null;
    if (grade && ORDERED_GRADES.includes(grade)) {
      const label = gradeLabel(grade).toLowerCase();
      const existing = guild?.roles?.cache
        ? [...guild.roles.cache.values()].filter(
            (r) => r.name.toLowerCase() === label && !r.managed && r.id !== guild.roles.everyone?.id
          )
        : [];
      for (const r of existing) {
        await r.delete('Guardian setup — recréation des rôles').catch(() => {});
      }
      const roleColors = {
        [GRADE_NAMES.invite]: 0x95a5a6,
        [GRADE_NAMES.membre]: 0x3498db,
        [GRADE_NAMES.moderateur]: 0x2ecc71,
        [GRADE_NAMES.manager]: 0xe67e22,
        [GRADE_NAMES.owner]: 0xe74c3c
      };
      try {
        const role = await guild.roles.create({
          name: gradeLabel(grade),
          color: roleColors[grade] ?? 0x99aab5,
          reason: 'Guardian setup — recréation des rôles'
        });
        setGradeRole(guildId, grade, role.id);
      } catch (err) {
        logger.error(`Failed to recreate role for grade ${grade}`, err);
      }
      const cursor = getGradeCursor(guildId);
      const nextCursor = cursor + 1;
      if (nextCursor >= ORDERED_GRADES.length) {
        setGuildSetting(guildId, 'setup', 'roles_auto_created', true);
        setGuildSetting(guildId, 'setup', 'fresh_install', false);
        setGradeCursor(guildId, 0);
      } else {
        setGradeCursor(guildId, nextCursor);
      }
    }
    await renderStep(interaction, 1);
    return true;
  }

  if (interaction.customId.startsWith(`${CUSTOM_IDS.renameGradePrefix}:`) && !interaction.customId.includes(':modal')) {
    const grade = interaction.customId.split(':').pop();
    if (!ORDERED_GRADES.includes(grade)) return true;
    const currentName = getGradeRenameMap(guildId)[grade] || gradeLabel(grade);
    const modal = new ModalBuilder()
      .setCustomId(`${CUSTOM_IDS.renameGradeModal}:${grade}`)
      .setTitle(`Renommer le grade ${gradeLabel(grade)}`)
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('name')
          .setLabel('Nouveau nom (laisser vide = défaut)')
          .setStyle(TextInputStyle.Short)
          .setValue(currentName)
          .setRequired(false)
          .setMaxLength(32)
      ));
    await interaction.showModal(modal).catch((err) => logger.warn('showModal failed (renameGrade)', { error: err?.message }));
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith(`${CUSTOM_IDS.renameGradeModal}:`)) {
    const grade = interaction.customId.split(':').pop();
    if (!ORDERED_GRADES.includes(grade)) return true;
    const rawName = interaction.fields.getTextInputValue('name').trim();
    const finalName = rawName || gradeLabel(grade);
    setGradeRenameName(guildId, grade, finalName);
    const mappings = getGradeMappings(guildId);
    const roleId = mappings[grade];
    if (roleId && interaction.guild) {
      try {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role) await role.setName(finalName, 'Guardian setup — renommage grade');
      } catch (err) {
        logger.error(`Failed to rename role for grade ${grade}`, err);
      }
    }
    await renderStep(interaction, 1);
    return true;
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith(`${CUSTOM_IDS.selectRolePrefix}:`)) {
    const gradeName = interaction.customId.split(':').pop();
    if (!ORDERED_GRADES.includes(gradeName)) {
      await sendSetupMessage(interaction, t('setup.validationGenericError', {}, { guildId }));
      return true;
    }
    const roleId = interaction.values[0];

    if (roleId === 'none') {
      setGradeRole(guildId, gradeName, null);
      await renderStep(interaction, 1);
      return true;
    }

    setGradeRole(guildId, gradeName, roleId);
    const selectedRole = interaction.guild?.roles?.cache?.get(roleId);
    if (selectedRole) {
      const ROLE_COLORS = {
        [GRADE_NAMES.invite]: 0x95a5a6,
        [GRADE_NAMES.membre]: 0x3498db,
        [GRADE_NAMES.moderateur]: 0x2ecc71,
        [GRADE_NAMES.manager]: 0xe67e22,
        [GRADE_NAMES.owner]: 0xe74c3c
      };
      if (selectedRole.color === 0 || selectedRole.color === 0xffffff) {
        await selectedRole.edit({ color: ROLE_COLORS[gradeName] ?? 0x99aab5 }).catch((err) =>
          logger.warn(`[setup] Could not set color for role ${selectedRole.name}: ${err?.message}`)
        );
      }
    }
    const cursor = getGradeCursor(guildId);
    if (cursor < ORDERED_GRADES.length - 1) {
      setGradeCursor(guildId, cursor + 1);
      await renderStep(interaction, 1);
    } else {
      setGuildSetting(guildId, 'setup', 'step', 2);
      await renderStep(interaction, 2);
    }
    return true;
  }

  return false;
}

// ─── Sous-handler : Step 2 — Modules + Discord settings ──────────────────────

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

// ─── Sous-handler : Step 3 — Channels ────────────────────────────────────────

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

// ─── Sous-handler : Step 4 — Membres ─────────────────────────────────────────

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

// ─── Sous-handler : Step 5 — Vocal ────────────────────────────────────────────

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

// ─── Sous-handler : Step 6 — Jeux ─────────────────────────────────────────────

async function _handleStep6(guildId, interaction) {
  if (interaction.customId === CUSTOM_IDS.gamePagePrev) {
    setGamesPage(guildId, getGamesPage(guildId) - 1);
    await renderStep(interaction, 6); return true;
  }
  if (interaction.customId === CUSTOM_IDS.gamePageNext) {
    setGamesPage(guildId, getGamesPage(guildId) + 1);
    await renderStep(interaction, 6); return true;
  }

  if (interaction.customId === CUSTOM_IDS.addGame) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_IDS.addGameModal)
      .setTitle('Ajouter un jeu');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('name').setLabel('Nom du jeu')
          .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(64)
          .setPlaceholder('Ex: Counter-Strike 2, Minecraft...')
      )
    );
    await interaction.showModal(modal).catch((err) => logger.warn('showModal failed (addGame)', { error: err?.message })); return true;
  }

  if (interaction.isModalSubmit() && interaction.customId === CUSTOM_IDS.addGameModal) {
    const name = interaction.fields.getTextInputValue('name').trim();
    const galerieEnabled = false;
    const changelogEnabled = true;
    let steamResult = null;
    try {
      const encoded = encodeURIComponent(name);
      const res = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encoded}&l=french&cc=FR`);
      if (res.ok) {
        const data = await res.json();
        steamResult = data.items?.[0] || null;
        logger.info('Steam search', { name, found: steamResult?.name || null, id: steamResult?.id || null });
      } else {
        logger.warn('Steam search non-ok', { status: res.status, name });
      }
    } catch (err) {
      logger.error('Steam search error', { error: err?.message, name });
    }
    if (!steamResult) {
      const confirmModal = new ModalBuilder()
        .setCustomId(`${CUSTOM_IDS.addGameConfirmModal}:${encodeURIComponent(name)}`)
        .setTitle('⚠️ Jeu non trouvé sur Steam');
      confirmModal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name').setLabel('Nom du jeu (corriger si besoin)')
            .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(64)
            .setValue(name)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('steam_id').setLabel('Steam ID (laisser vide si jeu non Steam)')
            .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20)
            .setPlaceholder('Ex: 730 pour CS2 — vide si non disponible sur Steam')
        )
      );
      await interaction.showModal(confirmModal).catch((err) => logger.warn('showModal failed (confirmModal)', { error: err?.message })); return true;
    }
    let deferredReply = false;
    try {
      await interaction.deferReply({ ephemeral: true });
      deferredReply = true;
    } catch (err) {
      logger.warn('addGameModal: deferReply failed', { error: err?.message });
    }
    let game;
    try {
      game = addSetupGame(guildId, {
        name: steamResult.name,
        steam_app_id: String(steamResult.id),
        galerie_enabled: galerieEnabled,
        changelog_enabled: changelogEnabled
      });
      logger.info('Game added', { guildId, name: game.name, steam_app_id: game.steam_app_id });
    } catch (err) {
      logger.error('addSetupGame failed', { error: err?.message, guildId, name });
      if (deferredReply) await interaction.deleteReply().catch(() => {});
      return true;
    }
    const confirmMsg = [
      `✅ **Jeu ajouté : ${game.name}**`,
      `> Trouvé sur Steam : ID \`${game.steam_app_id}\``,
      '',
      'Tu peux modifier ce jeu à tout moment avec le bouton ✏️.'
    ].filter(Boolean).join('\n');
    try {
      const sent = await interaction.channel.send({ content: confirmMsg });
      if (sent?.deletable !== false) setTimeout(() => sent?.delete().catch(() => {}), 5000);
    } catch (err) {
      logger.error('addGameModal: channel.send failed', { error: err?.message });
    }
    if (deferredReply) await interaction.deleteReply().catch(() => {});
    const wizardMsg = await interaction.channel.messages.fetch({ limit: 20 })
      .then((msgs) => msgs.find((m) => m.author?.id === interaction.client?.user?.id && m.components?.length > 0))
      .catch((err) => { logger.error('addGameModal: fetch wizard msg failed', { error: err?.message }); return null; });
    if (wizardMsg) {
      const fakeIx = { guildId, guild: interaction.guild, message: wizardMsg, channel: interaction.channel, deferUpdate: async () => {} };
      await renderStep(fakeIx, 6).catch((err) => logger.error('addGameModal: renderStep failed', { error: err?.message }));
    } else {
      logger.warn('addGameModal: wizard message not found in channel, cannot re-render step 6');
    }
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId?.startsWith(`${CUSTOM_IDS.addGameConfirmModal}:`)) {
    const name = interaction.fields.getTextInputValue('name').trim();
    const steamId = interaction.fields.getTextInputValue('steam_id').trim() || null;
    try { await interaction.deferUpdate(); } catch {}
    let game;
    try {
      game = addSetupGame(guildId, { name, steam_app_id: steamId, galerie_enabled: false, changelog_enabled: true });
      logger.info('Game added (non-Steam)', { guildId, name: game.name, steam_app_id: game.steam_app_id });
    } catch (err) {
      logger.error('addGameConfirmModal: addSetupGame failed', { error: err?.message });
      return true;
    }
    const confirmMsg = [
      `✅ **Jeu ajouté : ${game.name}**`,
      game.steam_app_id ? `> Steam ID : \`${game.steam_app_id}\`` : '> Jeu non Steam — le suivi des mises à jour Steam ne sera pas disponible.',
      '',
      'Tu peux modifier ce jeu à tout moment avec le bouton ✏️.'
    ].join('\n');
    try { const sent = await interaction.channel.send({ content: confirmMsg }); if (sent?.deletable !== false) setTimeout(() => sent?.delete().catch(() => {}), 5000); } catch {}
    const wizardMsg = await interaction.channel.messages.fetch({ limit: 20 })
      .then((msgs) => msgs.find((m) => m.author?.id === interaction.client?.user?.id && m.components?.length > 0))
      .catch(() => null);
    if (wizardMsg) {
      const fakeIx = { guildId, guild: interaction.guild, message: wizardMsg, channel: interaction.channel, deferUpdate: async () => {} };
      await renderStep(fakeIx, 6).catch(() => {});
    }
    return true;
  }

  if (interaction.customId?.startsWith(`${CUSTOM_IDS.editGamePrefix}:`)) {
    const gameId = Number(interaction.customId.split(':').pop());
    const games = listSetupGames(guildId);
    const game = games.find((g) => g.game_id === gameId);
    if (!game) { await interaction.deferUpdate().catch(() => {}); return true; }
    const modal = new ModalBuilder()
      .setCustomId(`${CUSTOM_IDS.editGameModal}:${gameId}`)
      .setTitle(`Modifier : ${game.name.slice(0, 40)}`);
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('name').setLabel('Nom du jeu')
          .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(64)
          .setValue(game.name)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('steam_id').setLabel('Steam ID (vider = jeu non Steam)')
          .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20)
          .setValue(game.steam_app_id || '')
          .setPlaceholder('Ex: 730 pour CS2 — laisser vide si non Steam')
      )
    );
    await interaction.showModal(modal).catch((err) => logger.warn('showModal failed (editGame)', { error: err?.message })); return true;
  }

  if (interaction.isModalSubmit() && interaction.customId?.startsWith(`${CUSTOM_IDS.editGameModal}:`)) {
    const gameId = Number(interaction.customId.split(':').pop());
    const name = interaction.fields.getTextInputValue('name').trim();
    const steamId = interaction.fields.getTextInputValue('steam_id').trim() || null;
    const existingGame = listSetupGames(guildId).find((g) => g.game_id === gameId);
    const galerie = Boolean(existingGame?.galerie_enabled);
    const changelog = Boolean(existingGame?.changelog_enabled);
    try {
      updateSetupGame(guildId, gameId, { name, steam_app_id: steamId, galerie_enabled: galerie, changelog_enabled: changelog });
      logger.info('Game updated', { guildId, gameId, name });
    } catch (err) {
      logger.error('updateSetupGame failed', { error: err?.message, guildId, gameId });
    }
    try { await interaction.deferUpdate(); } catch {}
    const wizardMsg = await interaction.channel.messages.fetch({ limit: 20 })
      .then((msgs) => msgs.find((m) => m.author?.id === interaction.client?.user?.id && m.components?.length > 0))
      .catch(() => null);
    if (wizardMsg) {
      const fakeIx = { guildId, guild: interaction.guild, message: wizardMsg, channel: interaction.channel, deferUpdate: async () => {} };
      await renderStep(fakeIx, 6).catch((err) => logger.error('editGameModal: renderStep failed', { error: err?.message }));
    }
    return true;
  }

  if (interaction.customId?.startsWith(`${CUSTOM_IDS.toggleGameGallery}:`)) {
    const gameId = Number(interaction.customId.split(':').pop());
    const game = listSetupGames(guildId).find((g) => g.game_id === gameId);
    if (game) { updateSetupGame(guildId, gameId, { ...game, galerie_enabled: !game.galerie_enabled }); }
    await renderStep(interaction, 6); return true;
  }
  if (interaction.customId?.startsWith(`${CUSTOM_IDS.toggleGameChangelog}:`)) {
    const gameId = Number(interaction.customId.split(':').pop());
    const game = listSetupGames(guildId).find((g) => g.game_id === gameId);
    if (game) { updateSetupGame(guildId, gameId, { ...game, changelog_enabled: !game.changelog_enabled }); }
    await renderStep(interaction, 6); return true;
  }
  if (interaction.customId?.startsWith(`${CUSTOM_IDS.toggleGameText}:`)) {
    const gameId = Number(interaction.customId.split(':').pop());
    const game = listSetupGames(guildId).find((g) => g.game_id === gameId);
    if (game) { updateSetupGame(guildId, gameId, { ...game, text_channel_enabled: !game.text_channel_enabled }); }
    await renderStep(interaction, 6); return true;
  }
  if (interaction.customId?.startsWith(`${CUSTOM_IDS.deleteGamePrefix}:`)) {
    const gameId = Number(interaction.customId.split(':').pop());
    const db = require('../../database/db').getDb();
    db.prepare('DELETE FROM games WHERE guild_id = ? AND game_id = ?').run(guildId, gameId);
    await renderStep(interaction, 6); return true;
  }

  if (interaction.customId === CUSTOM_IDS.clearAllGames) {
    const db = require('../../database/db').getDb();
    db.prepare('DELETE FROM games WHERE guild_id = ?').run(guildId);
    setGuildSetting(guildId, 'setup', 'detected_games', null);
    setGamesPage(guildId, 0);
    await renderStep(interaction, 6); return true;
  }

  return false;
}

// ─── Sous-handler : Step 7 — Modération ───────────────────────────────────────

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

// ─── Sous-handler : Step 4 (suite) + Sécurité ────────────────────────────────

async function _handleStep4Security(guildId, interaction) {
  if (interaction.customId === CUSTOM_IDS.editWelcomeText) {
    const current = getStep4Config(guildId).welcomeText;
    const modal = new ModalBuilder().setCustomId(CUSTOM_IDS.welcomeModal).setTitle('Message de bienvenue')
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('text')
          .setLabel('Variables: {username}, {servername}, {delay}')
          .setStyle(TextInputStyle.Paragraph).setValue(current).setRequired(false).setMaxLength(500)
      ));
    await interaction.showModal(modal).catch((err) => logger.warn('showModal failed (welcome)', { error: err?.message })); return true;
  }
  if (interaction.isModalSubmit() && interaction.customId === CUSTOM_IDS.welcomeModal) {
    const text = interaction.fields.getTextInputValue('text').trim();
    setGuildSetting(guildId, 'members', 'welcome_text', text);
    await renderStep(interaction, 4); return true;
  }

  if (interaction.customId === CUSTOM_IDS.editJoinPresentation) {
    const current = getStep4Config(guildId).joinServerPresentation;
    const modal = new ModalBuilder().setCustomId(CUSTOM_IDS.joinPresentationModal).setTitle('Présentation #rejoindre-notre-serveur')
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('text')
          .setLabel('Pourquoi rejoindre votre serveur ? (Manager/Owner)')
          .setStyle(TextInputStyle.Paragraph).setValue(current).setRequired(false).setMaxLength(1000)
          .setPlaceholder('Décrivez votre communauté, ses valeurs, ce que les membres y trouvent…')
      ));
    await interaction.showModal(modal).catch((err) => logger.warn('showModal failed (joinPresentation)', { error: err?.message })); return true;
  }

  if (interaction.isModalSubmit() && interaction.customId === CUSTOM_IDS.joinPresentationModal) {
    const text = interaction.fields.getTextInputValue('text').trim();
    setGuildSetting(guildId, 'joinserver', 'presentation', text || null);
    const { seedJoinServerChannel } = require('../members/joinServerChannel');
    const { findChannelByName } = require('../utils/channels');
    const { CHANNELS } = require('../../config');
    const ch = findChannelByName(interaction.guild, CHANNELS.joinServer);
    if (ch) await seedJoinServerChannel(ch, interaction.guild).catch(() => {});
    await renderStep(interaction, 4); return true;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === CUSTOM_IDS.selectOwnerMember) {
    const memberId = interaction.values[0];
    if (memberId === 'none') { await interaction.deferUpdate().catch(() => {}); return true; }
    setGuildSetting(guildId, 'setup', 'pending_owner_id', memberId);
    await interaction.deferUpdate().catch(() => {});
    const members = await interaction.guild.members.fetch().catch(() => null);
    const nonBots = members ? [...members.filter((m) => !m.user.bot).values()].slice(0, 25) : [];
    const mappings = getGradeMappings(guildId);
    const ownerRoleId = mappings[GRADE_NAMES.owner];
    const inviterId = getGuildSetting(guildId, 'setup', 'inviter_id', null);
    const sorted = inviterId
      ? [...nonBots].sort((a, b) => (a.id === inviterId ? -1 : b.id === inviterId ? 1 : 0))
      : nonBots;
    const options = sorted.map((m) => {
      let tag = '';
      if (m.id === memberId) tag = '✅ Sélectionné — ';
      else if (m.id === inviterId) tag = '⭐ A invité le bot — ';
      return {
        label: (m.nickname || m.user.displayName || m.user.username).slice(0, 25),
        value: m.id,
        description: (tag + `@${m.user.username}`).slice(0, 50)
      };
    });
    const selectedMember = nonBots.find((m) => m.id === memberId);
    const selectedName = selectedMember ? (selectedMember.nickname || selectedMember.user.displayName || selectedMember.user.username) : memberId;
    const ownerRoleMention = ownerRoleId ? `<@&${ownerRoleId}>` : '**Owner**';
    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(CUSTOM_IDS.selectOwnerMember)
        .setPlaceholder(`Sélectionné : ${selectedName.slice(0, 40)}`)
        .setMinValues(1).setMaxValues(1)
        .addOptions(options.length ? options : [{ label: 'Aucun membre', value: 'none' }])
    );
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.confirmOwner}:${memberId}`)
        .setLabel(`✅ Confirmer ${selectedName.slice(0, 30)} comme Owner`)
        .setStyle(ButtonStyle.Success)
    );
    await interaction.message.edit({
      content: [
        `## 👑 Confirmation de l'Owner`,
        '',
        `Le rôle ${ownerRoleMention} sera attribué à **${selectedName}**.`,
        '',
        '> ⚠️ **L\'Owner aura tous les droits Guardian sur ce serveur** : gestion des grades, modération, configuration complète.',
        '> Confirme le membre Owner avant de continuer.'
      ].join('\n'),
      components: [selectRow, confirmRow]
    }).catch(() => {});
    return true;
  }

  if (interaction.customId.startsWith(`${CUSTOM_IDS.confirmOwner}:`)) {
    const memberId = interaction.customId.split(':').pop();
    await interaction.deferUpdate().catch(() => {});
    const mappings = getGradeMappings(guildId);
    const ownerRoleId = mappings[GRADE_NAMES.owner];
    if (ownerRoleId && interaction.guild) {
      try {
        const allMembers = await interaction.guild.members.fetch().catch(() => null);
        if (allMembers) {
          for (const [, m] of allMembers) {
            if (!m.user.bot && m.roles.cache.has(ownerRoleId) && m.id !== memberId) {
              await m.roles.remove(ownerRoleId, 'Guardian setup — retrait Owner précédent').catch(() => {});
            }
          }
        }
        const member = await interaction.guild.members.fetch(memberId);
        await member.roles.add(ownerRoleId, 'Guardian setup — attribution rôle Owner');
        setGuildSetting(guildId, 'setup', 'owner_id', memberId);
      } catch (err) {
        logger.error('Failed to assign owner role', err);
      }
    }
    await interaction.message.delete().catch(() => {});
    const guild = interaction.guild;
    try {
      const ownerRoleForPos = guild?.roles?.cache?.get(ownerRoleId);
      const botRole = guild?.members?.me?.roles?.botRole;
      if (ownerRoleForPos && botRole && botRole.position <= ownerRoleForPos.position) {
        await guild.roles.setPositions([
          { role: botRole.id, position: ownerRoleForPos.position + 1 }
        ]).catch((err) => logger.warn(`[setup] reposition bot role failed: ${err?.message}`));
      }
    } catch {}
    const mappingsForSecurity = getGradeMappings(guildId);
    const guardianRoleIds = Object.values(mappingsForSecurity).filter(Boolean);
    const { dangerous, unused } = analyzeNonGuardianRoles(guild, guardianRoleIds);
    const _s = (key, vars) => t(key, vars || {}, { guildId });
    const acknowledgedOnEntry = new Set(getGuildSetting(guildId, 'setup', 'security_acknowledged', []));
    const hasIssues = dangerous.length > 0 || unused.length > 0;
    const alreadyAllResolved = hasIssues && !hasUnresolvedIssues(dangerous, unused, acknowledgedOnEntry);
    if (!hasIssues || alreadyAllResolved) {
      const fakeIx = { guildId, guild, channel: interaction.channel, client: interaction.client, message: { delete: async () => {} } };
      await advanceToStep2AfterSecurity(fakeIx, guildId);
    } else {
      const securityContent = buildSecurityCheckContent(dangerous, unused, _s, acknowledgedOnEntry);
      const rows = buildSecurityComponents(dangerous, unused, _s, acknowledgedOnEntry);
      await interaction.channel.send({ content: securityContent, components: rows }).catch(() => {});
    }
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.securityContinue) {
    const mappingsForSecCont = getGradeMappings(guildId);
    const guardianIdsForCont = Object.values(mappingsForSecCont).filter(Boolean);
    const { dangerous: dCont, unused: uCont } = analyzeNonGuardianRoles(interaction.guild, guardianIdsForCont);
    const acknowledgedCont = new Set(getGuildSetting(guildId, 'setup', 'security_acknowledged', []));
    if (hasUnresolvedIssues(dCont, uCont, acknowledgedCont)) {
      const modal = new ModalBuilder()
        .setCustomId(CUSTOM_IDS.securityConfirmModal)
        .setTitle(t('roleSecurity.modalTitle', {}, { guildId }).slice(0, 45));
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('confirmWord')
            .setLabel(t('roleSecurity.modalLabel', {}, { guildId }).slice(0, 45))
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(t('roleSecurity.modalConfirmWord', {}, { guildId }))
            .setRequired(true)
        )
      );
      await interaction.showModal(modal).catch(() => {});
    } else {
      await interaction.deferUpdate().catch(() => {});
      await advanceToStep2AfterSecurity(interaction, guildId);
    }
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.securityConfirmModal) {
    const confirmWord = interaction.fields?.getTextInputValue('confirmWord')?.trim().toUpperCase();
    const expected = t('roleSecurity.modalConfirmWord', {}, { guildId }).toUpperCase();
    if (confirmWord !== expected) {
      await replyEphemeral(interaction, t('roleSecurity.modalInvalid', {}, { guildId }));
      return true;
    }
    await interaction.deferUpdate().catch(() => {});
    await advanceToStep2AfterSecurity(interaction, guildId);
    return true;
  }

  if (interaction.customId.startsWith(`${CUSTOM_IDS.securityRoleAction}:`)) {
    const roleId = interaction.customId.split(':').pop();
    const role = interaction.guild?.roles.cache.get(roleId);
    const msg = role ? t('roleSecurity.modifyEphemeral', { name: role.name }, { guildId }) : null;
    const saved = getGuildSetting(guildId, 'setup', 'security_acknowledged', []);
    const acknowledged = new Set([...saved, roleId]);
    setGuildSetting(guildId, 'setup', 'security_acknowledged', [...acknowledged]);
    const guild = interaction.guild;
    const mappingsRA = getGradeMappings(guildId);
    const guardianIdsRA = Object.values(mappingsRA).filter(Boolean);
    const { dangerous: dRA, unused: uRA } = analyzeNonGuardianRoles(guild, guardianIdsRA);
    const _ra = (key, vars) => t(key, vars || {}, { guildId });
    const allDone = !hasUnresolvedIssues(dRA, uRA, acknowledged);
    const secContent = buildSecurityCheckContent(dRA, uRA, _ra, acknowledged);
    if (!secContent || allDone) {
      await interaction.deferUpdate().catch(() => {});
      await advanceToStep2AfterSecurity(interaction, guildId);
    } else {
      await interaction.update({ content: secContent, components: buildSecurityComponents(dRA, uRA, _ra, acknowledged) }).catch(() => {
        interaction.deferUpdate().catch(() => {});
      });
      if (msg) await replyEphemeral(interaction, msg).catch(() => {});
    }
    return true;
  }

  if (interaction.customId.startsWith(`${CUSTOM_IDS.securityDeleteUnused}:`)) {
    const roleId = interaction.customId.split(':').pop();
    await interaction.deferUpdate().catch(() => {});
    const guild = interaction.guild;
    if (guild) await guild.roles.fetch().catch(() => {});
    const roleToDelete = guild?.roles.cache.get(roleId);
    if (roleToDelete) await roleToDelete.delete('Guardian setup — suppression rôle inutilisé').catch(() => {});
    if (guild) await guild.roles.fetch().catch(() => {});
    const mappingsDU = getGradeMappings(guildId);
    const guardianIdsDU = Object.values(mappingsDU).filter(Boolean);
    const acknowledged = new Set(getGuildSetting(guildId, 'setup', 'security_acknowledged', []));
    const { dangerous, unused } = analyzeNonGuardianRoles(guild, guardianIdsDU);
    const _sd = (key, vars) => t(key, vars || {}, { guildId });
    const securityContent = buildSecurityCheckContent(dangerous, unused, _sd, acknowledged);
    if (securityContent) {
      await interaction.message.edit({ content: securityContent, components: buildSecurityComponents(dangerous, unused, _sd, acknowledged) }).catch(() => {});
    } else {
      await advanceToStep2AfterSecurity(interaction, guildId);
    }
    return true;
  }

  if (interaction.customId.startsWith(`${CUSTOM_IDS.securityKeepUnused}:`)) {
    const roleId = interaction.customId.split(':').pop();
    await interaction.deferUpdate().catch(() => {});
    const guild = interaction.guild;
    const mappingsKU = getGradeMappings(guildId);
    const guardianIdsKU = Object.values(mappingsKU).filter(Boolean);
    const acknowledged = new Set(getGuildSetting(guildId, 'setup', 'security_acknowledged', []));
    acknowledged.add(roleId);
    setGuildSetting(guildId, 'setup', 'security_acknowledged', [...acknowledged]);
    const { dangerous, unused: remainingUnused } = analyzeNonGuardianRoles(guild, [...guardianIdsKU, roleId]);
    const _sk = (key, vars) => t(key, vars || {}, { guildId });
    const securityContent = buildSecurityCheckContent(dangerous, remainingUnused, _sk, acknowledged);
    if (securityContent) {
      await interaction.message.edit({ content: securityContent, components: buildSecurityComponents(dangerous, remainingUnused, _sk, acknowledged) }).catch(() => {});
    } else {
      await advanceToStep2AfterSecurity(interaction, guildId);
    }
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.securityDeleteAllUnused) {
    await interaction.deferUpdate().catch(() => {});
    const guild = interaction.guild;
    if (guild) await guild.roles.fetch().catch((e) => logger.warn(`[security] fetch roles failed: ${e?.message}`));
    const mappingsDA = getGradeMappings(guildId);
    const guardianIdsDA = Object.values(mappingsDA).filter(Boolean);
    const { unused: allUnused } = analyzeNonGuardianRoles(guild, guardianIdsDA);
    let deleteFailed = false;
    for (const r of allUnused) {
      const role = guild?.roles.cache.get(r.id);
      if (role) {
        await role.delete('Guardian setup — suppression rôles inutilisés').catch((err) => {
          logger.warn(`[security] delete ${r.name} FAILED: ${err?.message} (code: ${err?.code})`);
          if (err?.code === 50013) deleteFailed = true;
        });
      }
    }
    if (deleteFailed) {
      await replyEphemeral(interaction, t('roleSecurity.deletePermissionError', {}, { guildId }));
    }
    if (guild) await guild.roles.fetch().catch(() => {});
    const acknowledged = new Set(getGuildSetting(guildId, 'setup', 'security_acknowledged', []));
    const { dangerous: dangerousAfter, unused: unusedAfter } = analyzeNonGuardianRoles(guild, guardianIdsDA);
    const _da = (key, vars) => t(key, vars || {}, { guildId });
    const securityContent = buildSecurityCheckContent(dangerousAfter, unusedAfter, _da, acknowledged);
    if (securityContent) {
      await interaction.message.edit({ content: securityContent, components: buildSecurityComponents(dangerousAfter, unusedAfter, _da, acknowledged) }).catch(() => {});
    } else {
      await advanceToStep2AfterSecurity(interaction, guildId);
    }
    return true;
  }

  return false;
}

// ─── Sous-handler : Step 8 — AutoMod + Onboarding (premium) ──────────────────
// @premium-start
async function _handleStep8(guildId, interaction) {
  if (interaction.customId.startsWith(`${CUSTOM_IDS.toggleAutoModRule}:`)) {
    await interaction.deferUpdate().catch(() => {});
    const ruleKey = interaction.customId.split(':').pop();
    const automod = getAutoModConfig(guildId);
    const cfg = automod[ruleKey];
    if (!cfg) { await renderStep(interaction, 8); return true; }
    if (cfg.enabled) {
      const { disableAutoModRule: _dis } = require('./discordSettings');
      await _dis(interaction.guild, ruleKey);
    } else {
      const words = (() => { const w = getGuildSetting(guildId, 'automod', 'blacklist_words', []); return Array.isArray(w) ? w : []; })();
      await applyAutoModRule(interaction.guild, ruleKey, words);
    }
    await renderStep(interaction, 8); return true;
  }

  if (interaction.customId === CUSTOM_IDS.applyOnboardingChannels) {
    await interaction.deferUpdate().catch(() => {});
    const channelIds = [
      getGuildSetting(guildId, 'channels', 'general_channel_id', null),
      getGuildSetting(guildId, 'channels', 'rules_channel_id', null),
    ].filter((id) => id && id !== 'guardian:create');
    if (channelIds.length > 0 && interaction.guild) {
      const res = await addOnboardingDefaultChannels(interaction.guild, channelIds);
      await sendSetupMessage(interaction, res.ok
        ? `✅ ${channelIds.length} channel(s) ajouté(s) à l\'onboarding Discord.`
        : `⚠️ Échec onboarding : ${res.error}`);
    } else {
      await sendSetupMessage(interaction, '⚠️ Aucun channel configuré à ajouter à l\'onboarding.');
    }
    await renderStep(interaction, 8); return true;
  }

  if (interaction.customId === CUSTOM_IDS.discordSettingsSkip) {
    const nextStep = 9;
    setGuildSetting(guildId, 'setup', 'step', nextStep);
    await renderStep(interaction, nextStep); return true;
  }

  return false;
}
// @premium-end

// ─── Sous-handler : Navigation + Transitions ──────────────────────────────────

async function _handleNavAndTransitions(guildId, interaction) {
  if (interaction.customId === CUSTOM_IDS.back) {
    const currentStep = getCurrentStep(guildId);
    const prevStep = Math.max(1, currentStep - 1);
    setGuildSetting(guildId, 'setup', 'step', prevStep);
    await renderStep(interaction, prevStep);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.next) {
    const currentStep = getCurrentStep(guildId);

    if (currentStep === 1 && interaction.guild) {
      const guild = interaction.guild;
      if (guild.roles?.fetch) await guild.roles.fetch().catch(() => {});
      const validation = validateStepOneMappings(guild);
      if (!validation.ok && validation.reason !== 'owner_cardinality' && validation.reason !== 'owner_role_missing') {
        await sendSetupMessage(interaction, explainStepOneValidation(guildId, validation));
        return true;
      }
      await interaction.deferUpdate().catch(() => {});
      const members = await guild.members.fetch().catch(() => null);
      const nonBots = members ? [...members.filter((m) => !m.user.bot).values()].slice(0, 25) : [];
      const mappings = getGradeMappings(guildId);
      const ownerRoleId = mappings[GRADE_NAMES.owner];
      const ownerRole = ownerRoleId ? guild.roles.cache.get(ownerRoleId) : null;
      const currentOwnerMember = ownerRole
        ? guild.members.cache.find((m) => m.roles.cache.has(ownerRoleId) && !m.user.bot)
        : null;
      const inviterId = getGuildSetting(guildId, 'setup', 'inviter_id', null);
      const suggestedId = currentOwnerMember?.id ?? inviterId ?? null;
      const sorted = inviterId
        ? [...nonBots].sort((a, b) => (a.id === inviterId ? -1 : b.id === inviterId ? 1 : 0))
        : nonBots;
      const options = sorted.map((m) => {
        let tag = '';
        if (m.id === currentOwnerMember?.id) tag = '👑 Owner actuel — ';
        else if (m.id === inviterId) tag = '⭐ A invité le bot — ';
        return {
          label: (m.nickname || m.user.displayName || m.user.username).slice(0, 25),
          value: m.id,
          description: (tag + `@${m.user.username}`).slice(0, 50)
        };
      });
      const ownerRoleMention = ownerRoleId ? `<@&${ownerRoleId}>` : '**Owner**';
      const preSelectedId = currentOwnerMember?.id ?? null;
      const preSelectedMember = preSelectedId ? nonBots.find((m) => m.id === preSelectedId) : null;
      const preSelectedName = preSelectedMember
        ? (preSelectedMember.nickname || preSelectedMember.user.displayName || preSelectedMember.user.username)
        : null;
      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(CUSTOM_IDS.selectOwnerMember)
          .setPlaceholder(preSelectedName
            ? `Owner actuel : ${preSelectedName.slice(0, 40)}`
            : inviterId && sorted[0]?.id === inviterId
              ? `Suggéré : ${(sorted[0].nickname || sorted[0].user.displayName || sorted[0].user.username).slice(0, 35)}`
              : 'Choisir le membre Owner')
          .setMinValues(1).setMaxValues(1)
          .addOptions(options.length ? options : [{ label: 'Aucun membre', value: 'none' }])
      );
      const confirmBtn = new ButtonBuilder()
        .setCustomId(preSelectedId
          ? `${CUSTOM_IDS.confirmOwner}:${preSelectedId}`
          : `${CUSTOM_IDS.confirmOwner}:none`)
        .setLabel(preSelectedName
          ? `✅ Confirmer ${preSelectedName.slice(0, 28)} comme Owner`
          : '✅ Confirmer le membre Owner')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!preSelectedId);
      const confirmRow = new ActionRowBuilder().addComponents(confirmBtn);
      await interaction.channel.send({
        content: [
          `## 👑 Confirmation de l'Owner`,
          '',
          preSelectedName
            ? `Le rôle ${ownerRoleMention} est actuellement attribué à **${preSelectedName}**.`
            : `Aucun membre n'a encore le rôle ${ownerRoleMention}.`,
          '',
          '> ⚠️ **L\'Owner aura tous les droits Guardian sur ce serveur** : gestion des grades, modération, configuration complète.',
          '> Confirme ou modifie le membre Owner avant de continuer.'
        ].join('\n'),
        components: [selectRow, confirmRow]
      });
      return true;
    }

    const nextStep = Math.min(currentStep + 1, TOTAL_STEPS);
    if (nextStep === 3 && interaction.guild) {
      await interaction.deferUpdate().catch(() => {});
      if (!isCommunityGuild(interaction.guild)) {
        await interaction.message.edit({
          content: buildCommunityCheckContent(guildId, interaction.guild) + '\n\u200b',
          components: buildCommunityCheckComponents()
        }).catch(() => {});
        return true;
      }
      await interaction.message.edit({
        content: buildGameDetectContent(guildId, interaction.guild) + '\n\u200b',
        components: buildGameDetectComponents(interaction.guild)
      }).catch(() => {});
      return true;
    }
    setGuildSetting(guildId, 'setup', 'step', nextStep);
    if (nextStep === 3) autoPositionChannelCursor(guildId, interaction.guild);
    await renderStep(interaction, nextStep);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.communityCheckRetry) {
    await interaction.deferUpdate().catch(() => {});
    if (interaction.guild) await interaction.guild.fetch().catch(() => {});
    if (isCommunityGuild(interaction.guild)) {
      setGuildSetting(guildId, 'setup', 'step', 3);
      autoPositionChannelCursor(guildId, interaction.guild);
      await renderStep(interaction, 3);
    } else {
      await interaction.message.edit({
        content: buildCommunityCheckContent(guildId, interaction.guild) + '\n\u200b',
        components: buildCommunityCheckComponents()
      }).catch(() => {});
    }
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.communityCheckContinue) {
    await interaction.deferUpdate().catch(() => {});
    await interaction.message.edit({
      content: buildGameDetectContent(guildId, interaction.guild) + '\n\u200b',
      components: buildGameDetectComponents(interaction.guild)
    }).catch(() => {});
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.gameDetectAdopt) {
    await interaction.deferUpdate().catch(() => {});
    const games = detectExistingGameChannels(interaction.guild);
    setDetectedGames(guildId, games);
    await interaction.message.edit({
      content: buildGameReviewContent(guildId) + '\n\u200b',
      components: buildGameReviewComponents(guildId)
    }).catch(() => {});
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.gameReviewContinue) {
    await interaction.deferUpdate().catch(() => {});
    const games = getDetectedGames(guildId);
    setGameLinkCursor(guildId, 0);
    setGameLinkActiveType(guildId, null);
    for (const g of games) {
      const existing = listSetupGames(guildId).find((sg) => sg.name.toLowerCase() === (g.steamName || g.baseName).toLowerCase());
      if (!existing) addSetupGame(guildId, { name: g.steamName || g.baseName, steam_app_id: g.steamAppId || null });
    }
    if (games.length === 0) {
      setGuildSetting(guildId, 'setup', 'step', 3);
      setChannelCursor(guildId, 0);
      const detectedC = autoDetectGuardianChannels(interaction.guild);
      const slotsC = getActiveSlotsForInstall(guildId, interaction.guild);
      const anyFoundC = slotsC.some((s) => detectedC[s.key]);
      if (anyFoundC && !getGuildSetting(guildId, 'setup', 'channel_autodetect_done', false)) {
        await interaction.message.edit({
          content: buildChannelAutoDetectContent(guildId, interaction.guild) + '\n\u200b',
          components: buildChannelAutoDetectComponents()
        }).catch(() => {});
      } else {
        await renderStep(interaction, 3);
      }
    } else {
      await interaction.message.edit({
        content: buildGameLinkContent(guildId) + '\n\u200b',
        components: buildGameLinkComponents(guildId, interaction.guild)
      }).catch(() => {});
    }
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.gameReviewAdd) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_IDS.gameReviewAddModal)
      .setTitle('Ajouter un jeu')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Nom du jeu')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80)
            .setPlaceholder('Ex: Minecraft, Valorant…')
        )
      );
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId === CUSTOM_IDS.gameReviewAddModal) {
    await interaction.deferUpdate().catch(() => {});
    const name = interaction.fields.getTextInputValue('name').trim();
    if (name) {
      const steamMatch = matchGameFromChannelName(name);
      const games = getDetectedGames(guildId);
      games.push({ baseName: name, channels: [], steamName: steamMatch?.name ?? null, steamAppId: steamMatch?.appid ?? null });
      setDetectedGames(guildId, games);
    }
    await interaction.message.edit({
      content: buildGameReviewContent(guildId) + '\n\u200b',
      components: buildGameReviewComponents(guildId)
    }).catch(() => {});
    return true;
  }

  if (interaction.isButton() && interaction.customId.startsWith(CUSTOM_IDS.gameReviewRemovePrefix)) {
    await interaction.deferUpdate().catch(() => {});
    const idx = Number(interaction.customId.slice(CUSTOM_IDS.gameReviewRemovePrefix.length));
    const games = getDetectedGames(guildId);
    games.splice(idx, 1);
    setDetectedGames(guildId, games);
    await interaction.message.edit({
      content: buildGameReviewContent(guildId) + '\n\u200b',
      components: buildGameReviewComponents(guildId)
    }).catch(() => {});
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.gameDetectSkip) {
    await interaction.deferUpdate().catch(() => {});
    setGuildSetting(guildId, 'setup', 'step', 3);
    setChannelCursor(guildId, 0);
    const detected = autoDetectGuardianChannels(interaction.guild);
    const slots = getActiveSlotsForInstall(guildId, interaction.guild);
    const anyFound = slots.some((s) => detected[s.key]);
    if (anyFound && !getGuildSetting(guildId, 'setup', 'channel_autodetect_done', false)) {
      await interaction.message.edit({
        content: buildChannelAutoDetectContent(guildId, interaction.guild) + '\n\u200b',
        components: buildChannelAutoDetectComponents()
      }).catch(() => {});
    } else {
      await renderStep(interaction, 3);
    }
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.channelAutoDetectAccept) {
    await interaction.deferUpdate().catch(() => {});
    const detected = autoDetectGuardianChannels(interaction.guild);
    const slots = getActiveSlotsForInstall(guildId, interaction.guild);
    for (const slot of slots) {
      if (detected[slot.key]) setGuildSetting(guildId, slot.settingSection, slot.settingKey, detected[slot.key]);
    }
    setGuildSetting(guildId, 'setup', 'channel_autodetect_done', true);
    autoPositionChannelCursor(guildId, interaction.guild);
    await renderStep(interaction, 3);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.channelAutoDetectSkip) {
    await interaction.deferUpdate().catch(() => {});
    setGuildSetting(guildId, 'setup', 'channel_autodetect_done', true);
    await renderStep(interaction, 3);
    return true;
  }

  if (interaction.customId.startsWith(`${CUSTOM_IDS.gameLinkTypeSelect}:`)) {
    const parts = interaction.customId.split(':');
    const selectedType = parts[parts.length - 1];
    const currentActive = getGameLinkActiveType(guildId);
    setGameLinkActiveType(guildId, currentActive === selectedType ? null : selectedType);
    await interaction.deferUpdate().catch(() => {});
    await interaction.message.edit({
      content: buildGameLinkContent(guildId) + '\n\u200b',
      components: buildGameLinkComponents(guildId, interaction.guild)
    }).catch(() => {});
    return true;
  }

  if (interaction.customId.startsWith(`${CUSTOM_IDS.gameLinkChannelPrefix}:`)) {
    const parts = interaction.customId.split(':');
    const gameCursor = Number(parts[parts.length - 2]);
    const channelType = parts[parts.length - 1];
    const channelId = interaction.values?.[0];
    if (channelId) {
      const games = getDetectedGames(guildId);
      const game = games[gameCursor];
      if (game) {
        const ch = game.channels.find((c) => c.type === channelType);
        if (ch) { ch.linkedId = channelId; ch.linkedName = interaction.guild?.channels.cache.get(channelId)?.name || channelId; }
        setDetectedGames(guildId, games);
        const setupGame = listSetupGames(guildId).find((sg) => sg.name.toLowerCase() === game.baseName.toLowerCase());
        if (setupGame) {
          const patch = {};
          if (channelType === 'galerie') patch.galerie_enabled = 1;
          if (channelType === 'changelog') patch.changelog_enabled = 1;
          if (channelType === 'text') patch.text_channel_enabled = 1;
          if (Object.keys(patch).length) updateSetupGame(guildId, setupGame.game_id, patch);
        }
      }
    }
    const allLinked = (() => {
      const games = getDetectedGames(guildId);
      const parts2 = interaction.customId.split(':');
      const gc = Number(parts2[parts2.length - 2]);
      const game = games[gc];
      return game ? game.channels.every((c) => c.linkedId) : false;
    })();
    if (allLinked) {
      const games = getDetectedGames(guildId);
      const parts2 = interaction.customId.split(':');
      const gc = Number(parts2[parts2.length - 2]);
      const nextGc = gc + 1;
      if (nextGc < games.length) {
        setGuildSetting(guildId, 'setup', 'gamelink_cursor', nextGc);
      }
    }
    await interaction.deferUpdate().catch(() => {});
    await interaction.message.edit({
      content: buildGameLinkContent(guildId) + '\n\u200b',
      components: buildGameLinkComponents(guildId, interaction.guild)
    }).catch(() => {});
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.gameLinkNext || interaction.customId === CUSTOM_IDS.gameLinkSkip) {
    await interaction.deferUpdate().catch(() => {});
    const games = getDetectedGames(guildId);
    const cursor = getGameLinkCursor(guildId);
    setGameLinkActiveType(guildId, null);
    if (cursor < games.length - 1) {
      setGameLinkCursor(guildId, cursor + 1);
      await interaction.message.edit({
        content: buildGameLinkContent(guildId) + '\n\u200b',
        components: buildGameLinkComponents(guildId, interaction.guild)
      }).catch(() => {});
    } else {
      setGuildSetting(guildId, 'setup', 'step', 3);
      setChannelCursor(guildId, 0);
      const detectedGL = autoDetectGuardianChannels(interaction.guild);
      const slotsGL = getActiveSlotsForInstall(guildId, interaction.guild);
      const anyFoundGL = slotsGL.some((s) => detectedGL[s.key]);
      if (anyFoundGL && !getGuildSetting(guildId, 'setup', 'channel_autodetect_done', false)) {
        await interaction.message.edit({
          content: buildChannelAutoDetectContent(guildId, interaction.guild) + '\n\u200b',
          components: buildChannelAutoDetectComponents()
        }).catch(() => {});
      } else {
        await renderStep(interaction, 3);
      }
    }
    return true;
  }

  // ── Nouvelles options MAJ ──────────────────────────────────────────────────
  if (interaction.customId === CUSTOM_IDS.newOptionsNext) {
    const pending = getPendingNewOptions(guildId, interaction.guild);
    const cursor = getGuildSetting(guildId, 'setup', 'new_options_cursor', 0);
    const next = cursor + 1;
    if (next >= pending.length) {
      setGuildSetting(guildId, 'setup', 'new_options_done', 1);
      await interaction.message?.edit({ content: buildNewOptionsDoneContent(guildId), components: [buildNewOptionsDoneRow(guildId)] }).catch(() => {});
      await interaction.deferUpdate().catch(() => {});
    } else {
      setGuildSetting(guildId, 'setup', 'new_options_cursor', next);
      await interaction.message?.edit({ content: buildNewOptionsContent(guildId, interaction.guild), components: buildNewOptionsComponents(guildId, interaction.guild) }).catch(() => {});
      await interaction.deferUpdate().catch(() => {});
    }
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.newOptionsSkip) {
    setGuildSetting(guildId, 'setup', 'new_options_done', 1);
    await interaction.message?.edit({ content: buildNewOptionsDoneContent(guildId), components: [buildNewOptionsDoneRow(guildId)] }).catch(() => {});
    await interaction.deferUpdate().catch(() => {});
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.finalize) {
    if (getCurrentStep(guildId) < TOTAL_STEPS) {
      await sendSetupMessage(interaction, t('setup.finalizeNotReady', {}, { guildId }));
      return true;
    }
    if (!interaction.guild) return true;

    // Intercept : nouvelles options à configurer ?
    const pending = getPendingNewOptions(guildId, interaction.guild);
    const newOptionsDone = getGuildSetting(guildId, 'setup', 'new_options_done', 0);
    if (pending.length > 0 && !newOptionsDone) {
      setGuildSetting(guildId, 'setup', 'new_options_cursor', 0);
      await interaction.message?.edit({
        content: buildNewOptionsContent(guildId, interaction.guild),
        components: buildNewOptionsComponents(guildId, interaction.guild)
      }).catch(() => {});
      await interaction.deferUpdate().catch(() => {});
      return true;
    }

    // Intercept : proposition de notifier les membres existants ?
    const notifyDone = getGuildSetting(guildId, 'setup', 'notify_members_done', 0);
    if (!notifyDone) {
      setGuildSetting(guildId, 'setup', 'notify_members_done', 1);
      await interaction.message?.edit({
        content: buildNotifyMembersContent(guildId),
        components: buildNotifyMembersComponents()
      }).catch(() => {});
      await interaction.deferUpdate().catch(() => {});
      return true;
    }

    await interaction.deferUpdate().catch(() => {});
    try {
      const { completeGuildSetup } = require('./setup');
      const { recordInstallVersion } = require('../migrations/channelMigrations');
      const { saveConfigBackup } = require('../config/configBackup');
      const { version } = require('../../package.json');
      await completeGuildSetup(interaction.guild);
      recordInstallVersion(guildId, version);
      await saveConfigBackup(interaction.guild);
      if (interaction.channel?.send) {
        await interaction.channel.send({ content: t('setup.finalized', {}, { guildId }) });
      }
    } catch (error) {
      logger.error('Failed to complete guild setup', error);
      if (interaction.channel?.send) {
        await interaction.channel.send({ content: t('setup.validationGenericError', {}, { guildId }) });
      }
    }
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.notifyMembersYes || interaction.customId === CUSTOM_IDS.notifyMembersNo) {
    await interaction.deferUpdate().catch(() => {});
    if (interaction.customId === CUSTOM_IDS.notifyMembersYes && interaction.guild) {
      const members = await interaction.guild.members.fetch().catch(() => null);
      if (members) {
        let sent = 0;
        for (const member of members.values()) {
          if (member.user.bot) continue;
          await sendInstallNotifyDm(member, guildId);
          sent++;
        }
        logger.info(`Guild ${guildId}: install notify DMs sent to ${sent} members`);
      }
    }
    const { completeGuildSetup } = require('./setup');
    const { recordInstallVersion } = require('../migrations/channelMigrations');
    const { saveConfigBackup } = require('../config/configBackup');
    const { version } = require('../../package.json');
    try {
      await completeGuildSetup(interaction.guild);
      recordInstallVersion(guildId, version);
      await saveConfigBackup(interaction.guild);
      if (interaction.channel?.send) {
        await interaction.channel.send({ content: t('setup.finalized', {}, { guildId }) });
      }
    } catch (error) {
      logger.error('Failed to complete guild setup after notify', error);
    }
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.prereleaseConfirm) {
    await interaction.deferUpdate().catch(() => {});
    const { version, prerelease } = require('../../package.json');
    setGuildSetting(guildId, 'bot', 'last_version', version);
    setGuildSetting(guildId, 'bot', 'prerelease_pending', null);
    const confirmed = [
      `## ✅ Mise à jour confirmée — **v${version}** ${prerelease ? '*(test)*' : ''}`,
      ``,
      `Guardian a été mis à jour sur **${interaction.guild?.name}**.`,
      `> La configuration est préservée. Merci d'avoir validé cette version de test.`
    ].join('\n');
    await interaction.message?.edit({ content: confirmed, components: [] }).catch(() => {});
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.prereleaseSkip) {
    await interaction.deferUpdate().catch(() => {});
    const { version } = require('../../package.json');
    setGuildSetting(guildId, 'bot', 'prerelease_skipped', version);
    const skipped = [
      `## ⏭️ Mise à jour ignorée — v${version} *(test)*`,
      ``,
      `Guardian continue de fonctionner avec la version précédente.`,
      `> Dès que cette version sera stable, la mise à jour s'appliquera automatiquement.`
    ].join('\n');
    await interaction.message?.edit({ content: skipped, components: [] }).catch(() => {});
    return true;
  }

  return false;
}

// ─── Dispatcher principal ────────────────────────────────────────────────────

async function handleSetupInteraction(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) return false;
  if (!interaction.customId || !interaction.customId.startsWith('setup:')) return false;

  const setupOwnerId = getGuildSetting(guildId, 'setup', 'owner_id', null);
  if (setupOwnerId && interaction.user.id !== setupOwnerId) {
    if (interaction.isRepliable()) await replyEphemeral(interaction, t('setup.forbiddenNotOwner', {}, { guildId }));
    return true;
  }

  if (interaction.locale && !getGuildSetting(guildId, 'i18n', 'language', null)) {
    const { detectLanguageFromLocale: _dlfl, setGuildLanguage: _sgl } = require('../i18n');
    _sgl(guildId, _dlfl(interaction.locale));
  }

  return (
    await _handleStep1(guildId, interaction) ||
    await _handleStep2(guildId, interaction) ||
    await _handleStep3(guildId, interaction) ||
    await _handleStep4(guildId, interaction) ||
    await _handleStep5(guildId, interaction) ||
    await _handleStep6(guildId, interaction) ||
    await _handleStep7(guildId, interaction) ||
    await _handleStep4Security(guildId, interaction) ||
    await _handleStep8(guildId, interaction) ||
    await _handleNavAndTransitions(guildId, interaction)
  );
}

module.exports = { handleSetupInteraction };
