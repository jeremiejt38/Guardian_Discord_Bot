const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const { GRADE_NAMES } = require('../../config');
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const { replyEphemeral } = require('../utils/interactions');
const {
  ORDERED_GRADES,
  setGradeRole,
  getGradeMappings,
  validateStepOneMappings
} = require('./gradeMapping');
const {
  listSetupGames,
  addSetupGame,
  removeLastSetupGame,
  updateSetupGame
} = require('./setupGames');
const { t } = require('../../locales');
const logger = require('../logs/logger');

const CUSTOM_IDS = Object.freeze({
  start: 'setup:start',
  selectRolePrefix: 'setup:grade:role',
  previousGrade: 'setup:grade:prev',
  nextGrade: 'setup:grade:next',
  toggleBioRequired: 'setup:members:bio:toggle',
  toggleSponsorshipRequired: 'setup:members:sponsorship:toggle',
  decreasePromotionDelay: 'setup:members:delay:dec',
  increasePromotionDelay: 'setup:members:delay:inc',
  toggleInviteExpulsion: 'setup:members:invite-expulsion:toggle',
  decreaseInviteExpulsionDays: 'setup:members:invite-expulsion-days:dec',
  increaseInviteExpulsionDays: 'setup:members:invite-expulsion-days:inc',
  cyclePromotionReviewerGrade: 'setup:members:reviewer:cycle',
  addGame: 'setup:games:add',
  removeLastGame: 'setup:games:remove-last',
  previousGame: 'setup:games:prev',
  nextGameItem: 'setup:games:next',
  toggleGameGallery: 'setup:games:gallery:toggle',
  toggleGameChangelog: 'setup:games:changelog:toggle',
  cycleGameAppId: 'setup:games:steam:cycle',
  toggleSuggestions: 'setup:modules:suggestions:toggle',
  toggleServerList: 'setup:modules:server-list:toggle',
  toggleStatusBot: 'setup:modules:status-bot:toggle',
  toggleAfk: 'setup:modules:afk:toggle',
  toggleGameUpdates: 'setup:modules:game-updates:toggle',
  toggleBehaviorScore: 'setup:modules:behavior:toggle',
  next: 'setup:step:next',
  finalize: 'setup:finalize'
});

const GRADE_LABELS = Object.freeze({
  [GRADE_NAMES.invite]: 'Invite',
  [GRADE_NAMES.membre]: 'Membre',
  [GRADE_NAMES.moderateur]: 'Moderateur',
  [GRADE_NAMES.manager]: 'Manager',
  [GRADE_NAMES.owner]: 'Owner'
});

function gradeLabel(gradeName) {
  return GRADE_LABELS[gradeName] || gradeName;
}

function getGradeCursor(guildId) {
  const cursor = getGuildSetting(guildId, 'setup', 'grade_cursor', 0);
  if (!Number.isInteger(cursor)) {
    return 0;
  }

  return Math.min(Math.max(cursor, 0), ORDERED_GRADES.length - 1);
}

function setGradeCursor(guildId, cursor) {
  const safeCursor = Math.min(Math.max(cursor, 0), ORDERED_GRADES.length - 1);
  setGuildSetting(guildId, 'setup', 'grade_cursor', safeCursor);
  return safeCursor;
}

function buildRoleOptions(guild, selectedRoleId) {
  const options = guild.roles.cache
    .filter((role) => role.id !== guild.id && !role.managed)
    .sort((a, b) => b.position - a.position)
    .first(25)
    .map((role) => ({
      label: role.name.slice(0, 100),
      value: role.id,
      default: role.id === selectedRoleId
    }));

  if (selectedRoleId && !options.find((option) => option.value === selectedRoleId)) {
    const selectedRole = guild.roles.cache.get(selectedRoleId);
    if (selectedRole) {
      options.unshift({
        label: selectedRole.name.slice(0, 100),
        value: selectedRole.id,
        default: true
      });
    }
  }

  return options.slice(0, 25);
}

function buildSetupControls(guildId, step = 1) {
  const nextDisabled = step >= 5;
  const finalizeDisabled = step < 5;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.next)
      .setStyle(ButtonStyle.Primary)
      .setLabel(`${t('setup.currentStep', { step }, { guildId })}`)
      .setDisabled(nextDisabled),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.finalize)
      .setStyle(ButtonStyle.Success)
      .setLabel('Confirmer et installer')
      .setDisabled(finalizeDisabled)
  );
}

function getCurrentStep(guildId) {
  const step = getGuildSetting(guildId, 'setup', 'step', 1);
  return Number.isInteger(step) ? step : 1;
}

function buildStepOneContent(guildId, guild) {
  const mappings = getGradeMappings(guildId);
  const cursor = getGradeCursor(guildId);
  const currentGrade = ORDERED_GRADES[cursor];
  const summary = ORDERED_GRADES.map((grade) => {
    const roleId = mappings[grade];
    const marker = roleId ? t('setup.step1Mapped', {}, { guildId }) : t('setup.step1NotMapped', {}, { guildId });
    const roleText = roleId ? `<@&${roleId}>` : '-';
    return `- ${gradeLabel(grade)}: ${marker} ${roleText}`;
  }).join('\n');

  return [
    t('setup.step1Title', {}, { guildId }),
    t('setup.step1Instructions', {}, { guildId }),
    t('setup.step1CurrentGrade', { grade: gradeLabel(currentGrade) }, { guildId }),
    '',
    summary
  ].join('\n');
}

function buildStepOneComponents(guildId, guild) {
  const mappings = getGradeMappings(guildId);
  const cursor = getGradeCursor(guildId);
  const currentGrade = ORDERED_GRADES[cursor];
  const selectedRoleId = mappings[currentGrade];
  const roleOptions = buildRoleOptions(guild, selectedRoleId);

  const effectiveOptions = roleOptions.length > 0
    ? roleOptions
    : [{ label: 'Aucun rôle disponible', value: 'none', description: 'Crée des rôles sur le serveur d\'abord' }];

  const roleSelector = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`${CUSTOM_IDS.selectRolePrefix}:${currentGrade}`)
      .setPlaceholder(t('setup.selectRolePlaceholder', { grade: gradeLabel(currentGrade) }, { guildId }))
      .setMinValues(1)
      .setMaxValues(1)
      .setDisabled(roleOptions.length === 0)
      .addOptions(effectiveOptions)
  );

  const gradeNavigation = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.previousGrade)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Grade precedent')
      .setDisabled(cursor === 0),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.nextGrade)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Grade suivant')
      .setDisabled(cursor >= ORDERED_GRADES.length - 1)
  );

  return [roleSelector, gradeNavigation, buildSetupControls(guildId, 1)];
}

function getStepTwoConfig(guildId) {
  return {
    promotionDelayHours: Math.max(12, Number(getGuildSetting(guildId, 'members', 'promotion_delay_hours', 48))),
    bioRequired: Boolean(getGuildSetting(guildId, 'members', 'bio_required', false)),
    sponsorshipRequired: Boolean(getGuildSetting(guildId, 'members', 'sponsorship_required', false)),
    reviewerGrade: getGuildSetting(guildId, 'members', 'promotion_review_grade', GRADE_NAMES.moderateur),
    inviteExpulsionEnabled: Boolean(getGuildSetting(guildId, 'members', 'invite_expulsion_enabled', true)),
    inviteExpulsionDays: Math.max(1, Number(getGuildSetting(guildId, 'members', 'invite_expulsion_days', 30)))
  };
}

function setStepTwoConfig(guildId, config) {
  setGuildSetting(guildId, 'members', 'promotion_delay_hours', config.promotionDelayHours);
  setGuildSetting(guildId, 'members', 'bio_required', config.bioRequired);
  setGuildSetting(guildId, 'members', 'sponsorship_required', config.sponsorshipRequired);
  setGuildSetting(guildId, 'members', 'promotion_review_grade', config.reviewerGrade);
  setGuildSetting(guildId, 'members', 'invite_expulsion_enabled', config.inviteExpulsionEnabled);
  setGuildSetting(guildId, 'members', 'invite_expulsion_days', config.inviteExpulsionDays);
}

function getStepThreeCursor(guildId) {
  const cursor = getGuildSetting(guildId, 'setup', 'game_cursor', 0);
  if (!Number.isInteger(cursor)) {
    return 0;
  }

  return Math.max(0, cursor);
}

function getStepFourConfig(guildId) {
  return {
    suggestionsEnabled: Boolean(getGuildSetting(guildId, 'channels', 'suggestions_enabled', true)),
    serverListEnabled: Boolean(getGuildSetting(guildId, 'channels', 'server_list_enabled', false)),
    statusBotEnabled: Boolean(getGuildSetting(guildId, 'channels', 'status_bot_enabled', true)),
    afkEnabled: Boolean(getGuildSetting(guildId, 'channels', 'afk_enabled', true)),
    gameUpdatesEnabled: Boolean(getGuildSetting(guildId, 'channels', 'game_updates_enabled', true)),
    behaviorScoreEnabled: Boolean(getGuildSetting(guildId, 'moderation', 'behavior_score_enabled', false))
  };
}

function setStepFourConfig(guildId, config) {
  setGuildSetting(guildId, 'channels', 'suggestions_enabled', config.suggestionsEnabled);
  setGuildSetting(guildId, 'channels', 'server_list_enabled', config.serverListEnabled);
  setGuildSetting(guildId, 'channels', 'status_bot_enabled', config.statusBotEnabled);
  setGuildSetting(guildId, 'channels', 'afk_enabled', config.afkEnabled);
  setGuildSetting(guildId, 'channels', 'game_updates_enabled', config.gameUpdatesEnabled);
  setGuildSetting(guildId, 'moderation', 'behavior_score_enabled', config.behaviorScoreEnabled);
}

function setStepThreeCursor(guildId, cursor) {
  const safeCursor = Math.max(0, cursor);
  setGuildSetting(guildId, 'setup', 'game_cursor', safeCursor);
  return safeCursor;
}

function cycleReviewerGrade(currentGrade) {
  const sequence = [GRADE_NAMES.moderateur, GRADE_NAMES.manager, GRADE_NAMES.owner];
  const currentIndex = sequence.indexOf(currentGrade);
  if (currentIndex < 0) {
    return sequence[0];
  }

  return sequence[(currentIndex + 1) % sequence.length];
}

function boolText(value, guildId) {
  return value ? t('setup.enabled', {}, { guildId }) : t('setup.disabled', {}, { guildId });
}

function buildStepTwoContent(guildId) {
  const config = getStepTwoConfig(guildId);
  return [
    t('setup.step2Title', {}, { guildId }),
    t('setup.step2Instructions', {}, { guildId }),
    '',
    `- ${t('setup.step2Delay', { hours: config.promotionDelayHours }, { guildId })}`,
    `- ${t('setup.step2Bio', { value: boolText(config.bioRequired, guildId) }, { guildId })}`,
    `- ${t('setup.step2Sponsorship', { value: boolText(config.sponsorshipRequired, guildId) }, { guildId })}`,
    `- ${t('setup.step2ReviewerGrade', { grade: gradeLabel(config.reviewerGrade) }, { guildId })}`,
    `- ${t('setup.step2InviteExpulsionEnabled', { value: boolText(config.inviteExpulsionEnabled, guildId) }, { guildId })}`,
    `- ${t('setup.step2InviteExpulsionDays', { days: config.inviteExpulsionDays }, { guildId })}`
  ].join('\n');
}

function buildStepTwoComponents(guildId) {
  const config = getStepTwoConfig(guildId);

  const toggles = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleBioRequired)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`Bio: ${boolText(config.bioRequired, guildId)}`),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleSponsorshipRequired)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`Parrainage: ${boolText(config.sponsorshipRequired, guildId)}`)
  );

  const ranges = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.decreasePromotionDelay)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('-12h'),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.increasePromotionDelay)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('+12h'),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.cyclePromotionReviewerGrade)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step2ReviewerButton', {}, { guildId })}: ${gradeLabel(config.reviewerGrade)}`)
  );

  const expulsion = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleInviteExpulsion)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step2InviteExpulsionButton', {}, { guildId })}: ${boolText(config.inviteExpulsionEnabled, guildId)}`),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.decreaseInviteExpulsionDays)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('-1j'),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.increaseInviteExpulsionDays)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('+1j')
  );

  return [toggles, ranges, expulsion, buildSetupControls(guildId, 2)];
}

function onOff(flag, guildId) {
  return flag ? t('setup.enabled', {}, { guildId }) : t('setup.disabled', {}, { guildId });
}

function getSteamCycleValue(value) {
  const sequence = [null, '440', '570', '730', '578080'];
  const currentIndex = sequence.indexOf(value || null);
  if (currentIndex < 0) {
    return sequence[0];
  }

  return sequence[(currentIndex + 1) % sequence.length];
}

function ensureAtLeastOneSetupGame(guildId) {
  const games = listSetupGames(guildId);
  if (games.length > 0) {
    return games;
  }

  addSetupGame(guildId);
  return listSetupGames(guildId);
}

function buildStepThreeContent(guildId) {
  const games = ensureAtLeastOneSetupGame(guildId);
  const rawCursor = getStepThreeCursor(guildId);
  const cursor = Math.min(rawCursor, games.length - 1);
  if (rawCursor !== cursor) {
    setStepThreeCursor(guildId, cursor);
  }

  const current = games[cursor];
  const summary = games
    .map((game, index) => {
      const marker = index === cursor ? '>' : '-';
      const steam = game.steam_app_id || 'none';
      const gallery = onOff(Boolean(game.galerie_enabled), guildId);
      const changelog = onOff(Boolean(game.changelog_enabled), guildId);
      return `${marker} ${game.name} | steam=${steam} | galerie=${gallery} | changelog=${changelog}`;
    })
    .join('\n');

  return [
    t('setup.step3Title', {}, { guildId }),
    t('setup.step3Instructions', {}, { guildId }),
    t('setup.step3CurrentGame', { name: current.name }, { guildId }),
    '',
    summary
  ].join('\n');
}

function buildStepThreeComponents(guildId) {
  const games = ensureAtLeastOneSetupGame(guildId);
  const rawCursor = getStepThreeCursor(guildId);
  const cursor = Math.min(rawCursor, games.length - 1);
  if (rawCursor !== cursor) {
    setStepThreeCursor(guildId, cursor);
  }

  const current = games[cursor];

  const listActions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.addGame)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(t('setup.step3AddGame', {}, { guildId })),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.removeLastGame)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(t('setup.step3RemoveLast', {}, { guildId }))
      .setDisabled(games.length <= 1)
  );

  const gameNavigation = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.previousGame)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(t('setup.step3PreviousGame', {}, { guildId }))
      .setDisabled(cursor === 0),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.nextGameItem)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(t('setup.step3NextGame', {}, { guildId }))
      .setDisabled(cursor >= games.length - 1)
  );

  const toggles = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleGameGallery)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step3Gallery', {}, { guildId })}: ${onOff(Boolean(current.galerie_enabled), guildId)}`),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleGameChangelog)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step3Changelog', {}, { guildId })}: ${onOff(Boolean(current.changelog_enabled), guildId)}`),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.cycleGameAppId)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step3SteamAppId', {}, { guildId })}: ${current.steam_app_id || 'none'}`)
  );

  return [listActions, gameNavigation, toggles, buildSetupControls(guildId, 3)];
}

function buildStepFourContent(guildId) {
  const config = getStepFourConfig(guildId);

  return [
    t('setup.step4Title', {}, { guildId }),
    t('setup.step4Instructions', {}, { guildId }),
    '',
    `- ${t('setup.step4Suggestions', {}, { guildId })}: ${onOff(config.suggestionsEnabled, guildId)}`,
    `- ${t('setup.step4ServerList', {}, { guildId })}: ${onOff(config.serverListEnabled, guildId)}`,
    `- ${t('setup.step4StatusBot', {}, { guildId })}: ${onOff(config.statusBotEnabled, guildId)}`,
    `- ${t('setup.step4Afk', {}, { guildId })}: ${onOff(config.afkEnabled, guildId)}`,
    `- ${t('setup.step4GameUpdates', {}, { guildId })}: ${onOff(config.gameUpdatesEnabled, guildId)}`,
    `- ${t('setup.step4Behavior', {}, { guildId })}: ${onOff(config.behaviorScoreEnabled, guildId)}`
  ].join('\n');
}

function buildStepFourComponents(guildId) {
  const config = getStepFourConfig(guildId);

  const rowOne = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleSuggestions)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step4Suggestions', {}, { guildId })}: ${onOff(config.suggestionsEnabled, guildId)}`),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleServerList)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step4ServerList', {}, { guildId })}: ${onOff(config.serverListEnabled, guildId)}`),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleStatusBot)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step4StatusBot', {}, { guildId })}: ${onOff(config.statusBotEnabled, guildId)}`)
  );

  const rowTwo = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleAfk)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step4Afk', {}, { guildId })}: ${onOff(config.afkEnabled, guildId)}`),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleGameUpdates)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step4GameUpdates', {}, { guildId })}: ${onOff(config.gameUpdatesEnabled, guildId)}`),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleBehaviorScore)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(`${t('setup.step4Behavior', {}, { guildId })}: ${onOff(config.behaviorScoreEnabled, guildId)}`)
  );

  return [rowOne, rowTwo, buildSetupControls(guildId, 4)];
}

function buildStepFiveSummary(guildId) {
  const mappings = getGradeMappings(guildId);
  const membersConfig = getStepTwoConfig(guildId);
  const games = listSetupGames(guildId);
  const modulesConfig = getStepFourConfig(guildId);

  return [
    t('setup.step5Title', {}, { guildId }),
    t('setup.step5Instructions', {}, { guildId }),
    '',
    `- ${t('setup.step5GradeMappings', {}, { guildId })}: ${Object.keys(mappings).length}/5`,
    `- ${t('setup.step5PromotionDelay', { hours: membersConfig.promotionDelayHours }, { guildId })}`,
    `- ${t('setup.step5Games', { count: games.length }, { guildId })}`,
    `- ${t('setup.step5ModulesEnabled', {}, { guildId })}:`,
    `  ${t('setup.step4Suggestions', {}, { guildId })}=${onOff(modulesConfig.suggestionsEnabled, guildId)},`,
    `  ${t('setup.step4ServerList', {}, { guildId })}=${onOff(modulesConfig.serverListEnabled, guildId)},`,
    `  ${t('setup.step4StatusBot', {}, { guildId })}=${onOff(modulesConfig.statusBotEnabled, guildId)},`,
    `  ${t('setup.step4Afk', {}, { guildId })}=${onOff(modulesConfig.afkEnabled, guildId)},`,
    `  ${t('setup.step4GameUpdates', {}, { guildId })}=${onOff(modulesConfig.gameUpdatesEnabled, guildId)},`,
    `  ${t('setup.step4Behavior', {}, { guildId })}=${onOff(modulesConfig.behaviorScoreEnabled, guildId)}`
  ].join('\n');
}

function buildStepFiveComponents(guildId) {
  return [buildSetupControls(guildId, 5)];
}

function explainStepOneValidation(guildId, validation) {
  if (validation.reason === 'missing_mappings') {
    const missing = validation?.details?.missingGrades || [];
    return t('setup.validationMissingMappings', { grades: missing.map(gradeLabel).join(', ') }, { guildId });
  }

  if (validation.reason === 'duplicate_roles') {
    return t('setup.validationDuplicateRoles', {}, { guildId });
  }

  if (validation.reason === 'owner_role_missing') {
    return t('setup.validationOwnerRoleMissing', {}, { guildId });
  }

  if (validation.reason === 'owner_cardinality') {
    return t('setup.validationOwnerCardinality', { count: validation?.details?.ownerCount ?? 0 }, { guildId });
  }

  return t('setup.validationGenericError', {}, { guildId });
}

async function renderStepOne(interaction) {
  await interaction.update({
    content: buildStepOneContent(interaction.guildId, interaction.guild),
    components: buildStepOneComponents(interaction.guildId, interaction.guild)
  });
}

async function renderStepTwo(interaction) {
  await interaction.update({
    content: buildStepTwoContent(interaction.guildId),
    components: buildStepTwoComponents(interaction.guildId)
  });
}

async function renderStepThree(interaction) {
  await interaction.update({
    content: buildStepThreeContent(interaction.guildId),
    components: buildStepThreeComponents(interaction.guildId)
  });
}

async function renderStepFour(interaction) {
  await interaction.update({
    content: buildStepFourContent(interaction.guildId),
    components: buildStepFourComponents(interaction.guildId)
  });
}

async function renderStepFive(interaction) {
  await interaction.update({
    content: buildStepFiveSummary(interaction.guildId),
    components: buildStepFiveComponents(interaction.guildId)
  });
}

async function handleSetupInteraction(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    return false;
  }

  if (!interaction.customId || !interaction.customId.startsWith('setup:')) {
    return false;
  }

  const setupOwnerId = getGuildSetting(guildId, 'setup', 'owner_id', null);
  if (setupOwnerId && interaction.user.id !== setupOwnerId) {
    if (interaction.isRepliable()) {
      await replyEphemeral(interaction, t('setup.forbiddenNotOwner', {}, { guildId }));
    }
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.start) {
    const step = getCurrentStep(guildId);
    setGradeCursor(guildId, getGradeCursor(guildId));

    if (step === 1 && interaction.guild) {
      await interaction.reply({
        content: buildStepOneContent(guildId, interaction.guild),
        components: buildStepOneComponents(guildId, interaction.guild),
        ephemeral: true
      });
    } else if (step === 2) {
      await interaction.reply({
        content: buildStepTwoContent(guildId),
        components: buildStepTwoComponents(guildId),
        ephemeral: true
      });
    } else if (step === 3) {
      await interaction.reply({
        content: buildStepThreeContent(guildId),
        components: buildStepThreeComponents(guildId),
        ephemeral: true
      });
    } else if (step === 4) {
      await interaction.reply({
        content: buildStepFourContent(guildId),
        components: buildStepFourComponents(guildId),
        ephemeral: true
      });
    } else if (step >= 5) {
      await interaction.reply({
        content: buildStepFiveSummary(guildId),
        components: buildStepFiveComponents(guildId),
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: t('setup.started', {}, { guildId }),
        components: [buildSetupControls(guildId, step)],
        ephemeral: true
      });
    }

    return true;
  }

  if (interaction.customId === CUSTOM_IDS.previousGrade) {
    setGradeCursor(guildId, getGradeCursor(guildId) - 1);
    await renderStepOne(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.nextGrade) {
    setGradeCursor(guildId, getGradeCursor(guildId) + 1);
    await renderStepOne(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleBioRequired) {
    const config = getStepTwoConfig(guildId);
    config.bioRequired = !config.bioRequired;
    setStepTwoConfig(guildId, config);
    await renderStepTwo(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleSponsorshipRequired) {
    const config = getStepTwoConfig(guildId);
    config.sponsorshipRequired = !config.sponsorshipRequired;
    setStepTwoConfig(guildId, config);
    await renderStepTwo(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.decreasePromotionDelay) {
    const config = getStepTwoConfig(guildId);
    config.promotionDelayHours = Math.max(12, config.promotionDelayHours - 12);
    setStepTwoConfig(guildId, config);
    await renderStepTwo(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.increasePromotionDelay) {
    const config = getStepTwoConfig(guildId);
    config.promotionDelayHours = Math.min(24 * 60, config.promotionDelayHours + 12);
    setStepTwoConfig(guildId, config);
    await renderStepTwo(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.cyclePromotionReviewerGrade) {
    const config = getStepTwoConfig(guildId);
    config.reviewerGrade = cycleReviewerGrade(config.reviewerGrade);
    setStepTwoConfig(guildId, config);
    await renderStepTwo(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleInviteExpulsion) {
    const config = getStepTwoConfig(guildId);
    config.inviteExpulsionEnabled = !config.inviteExpulsionEnabled;
    setStepTwoConfig(guildId, config);
    await renderStepTwo(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.decreaseInviteExpulsionDays) {
    const config = getStepTwoConfig(guildId);
    config.inviteExpulsionDays = Math.max(1, config.inviteExpulsionDays - 1);
    setStepTwoConfig(guildId, config);
    await renderStepTwo(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.increaseInviteExpulsionDays) {
    const config = getStepTwoConfig(guildId);
    config.inviteExpulsionDays = Math.min(365, config.inviteExpulsionDays + 1);
    setStepTwoConfig(guildId, config);
    await renderStepTwo(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.addGame) {
    addSetupGame(guildId);
    const games = listSetupGames(guildId);
    setStepThreeCursor(guildId, Math.max(0, games.length - 1));
    await renderStepThree(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.removeLastGame) {
    removeLastSetupGame(guildId);
    const games = ensureAtLeastOneSetupGame(guildId);
    setStepThreeCursor(guildId, Math.min(getStepThreeCursor(guildId), games.length - 1));
    await renderStepThree(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.previousGame) {
    setStepThreeCursor(guildId, getStepThreeCursor(guildId) - 1);
    await renderStepThree(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.nextGameItem) {
    setStepThreeCursor(guildId, getStepThreeCursor(guildId) + 1);
    await renderStepThree(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleGameGallery) {
    const games = ensureAtLeastOneSetupGame(guildId);
    const cursor = Math.min(getStepThreeCursor(guildId), games.length - 1);
    const current = games[cursor];
    updateSetupGame(guildId, current.game_id, { galerie_enabled: !Boolean(current.galerie_enabled) });
    await renderStepThree(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleGameChangelog) {
    const games = ensureAtLeastOneSetupGame(guildId);
    const cursor = Math.min(getStepThreeCursor(guildId), games.length - 1);
    const current = games[cursor];
    updateSetupGame(guildId, current.game_id, { changelog_enabled: !Boolean(current.changelog_enabled) });
    await renderStepThree(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.cycleGameAppId) {
    const games = ensureAtLeastOneSetupGame(guildId);
    const cursor = Math.min(getStepThreeCursor(guildId), games.length - 1);
    const current = games[cursor];
    const nextSteamValue = getSteamCycleValue(current.steam_app_id);
    updateSetupGame(guildId, current.game_id, { steam_app_id: nextSteamValue });
    await renderStepThree(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleSuggestions) {
    const config = getStepFourConfig(guildId);
    config.suggestionsEnabled = !config.suggestionsEnabled;
    setStepFourConfig(guildId, config);
    await renderStepFour(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleServerList) {
    const config = getStepFourConfig(guildId);
    config.serverListEnabled = !config.serverListEnabled;
    setStepFourConfig(guildId, config);
    await renderStepFour(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleStatusBot) {
    const config = getStepFourConfig(guildId);
    config.statusBotEnabled = !config.statusBotEnabled;
    setStepFourConfig(guildId, config);
    await renderStepFour(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleAfk) {
    const config = getStepFourConfig(guildId);
    config.afkEnabled = !config.afkEnabled;
    setStepFourConfig(guildId, config);
    await renderStepFour(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleGameUpdates) {
    const config = getStepFourConfig(guildId);
    config.gameUpdatesEnabled = !config.gameUpdatesEnabled;
    setStepFourConfig(guildId, config);
    await renderStepFour(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleBehaviorScore) {
    const config = getStepFourConfig(guildId);
    config.behaviorScoreEnabled = !config.behaviorScoreEnabled;
    setStepFourConfig(guildId, config);
    await renderStepFour(interaction);
    return true;
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith(`${CUSTOM_IDS.selectRolePrefix}:`)) {
    const gradeName = interaction.customId.split(':').pop();
    if (!ORDERED_GRADES.includes(gradeName)) {
      await replyEphemeral(interaction, t('setup.validationGenericError', {}, { guildId }));
      return true;
    }

    const roleId = interaction.values[0];
    setGradeRole(guildId, gradeName, roleId);

    await renderStepOne(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.next) {
    const currentStep = getCurrentStep(guildId);

    if (currentStep === 1 && interaction.guild) {
      const validation = validateStepOneMappings(interaction.guild);
      if (!validation.ok) {
        await replyEphemeral(interaction, explainStepOneValidation(guildId, validation));
        return true;
      }
    }

    const nextStep = Math.min(currentStep + 1, 5);
    setGuildSetting(guildId, 'setup', 'step', nextStep);

    if (nextStep === 2) {
      await interaction.update({
        content: buildStepTwoContent(guildId),
        components: buildStepTwoComponents(guildId)
      });
      return true;
    }

    if (nextStep === 3) {
      setStepThreeCursor(guildId, getStepThreeCursor(guildId));
      await interaction.update({
        content: buildStepThreeContent(guildId),
        components: buildStepThreeComponents(guildId)
      });
      return true;
    }

    if (nextStep === 4) {
      await interaction.update({
        content: buildStepFourContent(guildId),
        components: buildStepFourComponents(guildId)
      });
      return true;
    }

    if (nextStep === 5) {
      await interaction.update({
        content: buildStepFiveSummary(guildId),
        components: buildStepFiveComponents(guildId)
      });
      return true;
    }

    await interaction.update({
      content: t('setup.nextStepReady', {}, { guildId }),
      components: [buildSetupControls(guildId, nextStep)]
    });
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.finalize) {
    if (getCurrentStep(guildId) < 5) {
      await replyEphemeral(interaction, t('setup.step5NotReady', {}, { guildId }));
      return true;
    }

    if (!interaction.guild) {
      return true;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const { completeGuildSetup } = require('./setup');
      await completeGuildSetup(interaction.guild);
      await interaction.editReply(t('setup.finalized', {}, { guildId }));
    } catch (error) {
      logger.error('Failed to complete guild setup', error);
      await interaction.editReply(t('setup.validationGenericError', {}, { guildId }));
    }
    return true;
  }

  return false;
}

module.exports = {
  CUSTOM_IDS,
  buildSetupControls,
  handleSetupInteraction
};
