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



module.exports = { _handleStep1 };
