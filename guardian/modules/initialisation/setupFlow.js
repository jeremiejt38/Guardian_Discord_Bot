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

const TOTAL_STEPS = 6;

const CUSTOM_IDS = Object.freeze({
  start: 'setup:start',
  createRolesAuto: 'setup:grade:create-auto',
  selectRolePrefix: 'setup:grade:role',
  previousGrade: 'setup:grade:prev',
  nextGrade: 'setup:grade:next',
  back: 'setup:step:back',
  toggleSuggestions: 'setup:modules:suggestions:toggle',
  toggleServerList: 'setup:modules:server-list:toggle',
  toggleStatusBot: 'setup:modules:status-bot:toggle',
  toggleAfk: 'setup:modules:afk:toggle',
  toggleGameUpdates: 'setup:modules:game-updates:toggle',
  toggleBioRequired: 'setup:members:bio:toggle',
  toggleSponsorshipRequired: 'setup:members:sponsorship:toggle',
  decreasePromotionDelay: 'setup:members:delay:dec',
  increasePromotionDelay: 'setup:members:delay:inc',
  cyclePromotionReviewerGrade: 'setup:members:reviewer:cycle',
  toggleInviteExpulsion: 'setup:members:invite-expulsion:toggle',
  decreaseInviteExpulsionDays: 'setup:members:invite-expulsion-days:dec',
  increaseInviteExpulsionDays: 'setup:members:invite-expulsion-days:inc',
  addGame: 'setup:games:add',
  removeLastGame: 'setup:games:remove-last',
  previousGame: 'setup:games:prev',
  nextGameItem: 'setup:games:next',
  toggleGameGallery: 'setup:games:gallery:toggle',
  toggleGameChangelog: 'setup:games:changelog:toggle',
  cycleGameAppId: 'setup:games:steam:cycle',
  toggleBehaviorScore: 'setup:modules:behavior:toggle',
  decreaseSpamThreshold: 'setup:mod:spam:dec',
  increaseSpamThreshold: 'setup:mod:spam:inc',
  toggleBlacklistWarn: 'setup:mod:blacklist:toggle',
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
  if (!Number.isInteger(cursor)) return 0;
  return Math.min(Math.max(cursor, 0), ORDERED_GRADES.length - 1);
}

function setGradeCursor(guildId, cursor) {
  const safeCursor = Math.min(Math.max(cursor, 0), ORDERED_GRADES.length - 1);
  setGuildSetting(guildId, 'setup', 'grade_cursor', safeCursor);
  return safeCursor;
}

function getCurrentStep(guildId) {
  const step = getGuildSetting(guildId, 'setup', 'step', 1);
  return Number.isInteger(step) ? step : 1;
}

function boolText(value, guildId) {
  return value ? t('setup.enabled', {}, { guildId }) : t('setup.disabled', {}, { guildId });
}

function onOff(flag, guildId) {
  return flag ? t('setup.enabled', {}, { guildId }) : t('setup.disabled', {}, { guildId });
}

function buildNavRow(guildId, step) {
  const nextDisabled = step >= TOTAL_STEPS;
  const finalizeDisabled = step < TOTAL_STEPS;
  const buttons = [];
  if (step > 1) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.back)
        .setStyle(ButtonStyle.Secondary)
        .setLabel(t('setup.backStep', {}, { guildId }))
    );
  }
  buttons.push(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.next)
      .setStyle(ButtonStyle.Primary)
      .setLabel(t('setup.nextStep', { step, total: TOTAL_STEPS }, { guildId }))
      .setDisabled(nextDisabled)
  );
  buttons.push(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.finalize)
      .setStyle(ButtonStyle.Success)
      .setLabel(t('setup.finalizeButton', {}, { guildId }))
      .setDisabled(finalizeDisabled)
  );
  return new ActionRowBuilder().addComponents(buttons);
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

  if (selectedRoleId && !options.find((o) => o.value === selectedRoleId)) {
    const selectedRole = guild.roles.cache.get(selectedRoleId);
    if (selectedRole) {
      options.unshift({ label: selectedRole.name.slice(0, 100), value: selectedRole.id, default: true });
    }
  }

  return options.slice(0, 25);
}

function hasMapableRoles(guild) {
  return guild.roles.cache.some(
    (role) => role.id !== guild.roles.everyone.id && !role.managed
  );
}

function buildStepOneContent(guildId, guild) {
  const mappings = getGradeMappings(guildId);
  const cursor = getGradeCursor(guildId);
  const currentGrade = ORDERED_GRADES[cursor];
  const summary = ORDERED_GRADES.map((grade) => {
    const roleId = mappings[grade];
    const marker = roleId ? '✅' : '❌';
    const roleText = roleId ? `<@&${roleId}>` : '-';
    return `${marker} **${gradeLabel(grade)}** → ${roleText}`;
  }).join('\n');

  const noRoles = !hasMapableRoles(guild);
  const lines = [
    `## ${t('setup.step1Title', {}, { guildId })} (1/${TOTAL_STEPS})`
  ];

  if (noRoles) {
    lines.push(t('setup.step1NoRolesDesc', {}, { guildId }));
  } else {
    lines.push(t('setup.step1Instructions', {}, { guildId }));
    lines.push(`> ${t('setup.step1CurrentGrade', { grade: gradeLabel(currentGrade) }, { guildId })}`);
    lines.push('');
    lines.push(summary);
  }

  return lines.join('\n');
}

function buildStepOneComponents(guildId, guild) {
  if (!hasMapableRoles(guild)) {
    const autoRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.createRolesAuto)
        .setStyle(ButtonStyle.Primary)
        .setLabel(t('setup.step1CreateRolesAuto', {}, { guildId }))
    );
    return [autoRow, buildNavRow(guildId, 1)];
  }

  const mappings = getGradeMappings(guildId);
  const cursor = getGradeCursor(guildId);
  const currentGrade = ORDERED_GRADES[cursor];
  const selectedRoleId = mappings[currentGrade];
  const roleOptions = buildRoleOptions(guild, selectedRoleId);

  const effectiveOptions = roleOptions.length > 0
    ? roleOptions
    : [{ label: 'Aucun rôle disponible', value: 'none' }];

  const roleSelector = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`${CUSTOM_IDS.selectRolePrefix}:${currentGrade}`)
      .setPlaceholder(t('setup.selectRolePlaceholder', { grade: gradeLabel(currentGrade) }, { guildId }))
      .setMinValues(1).setMaxValues(1)
      .setDisabled(roleOptions.length === 0)
      .addOptions(effectiveOptions)
  );

  const gradeNavigation = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.previousGrade)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('◀ Grade précédent')
      .setDisabled(cursor === 0),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.nextGrade)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Grade suivant ▶')
      .setDisabled(cursor >= ORDERED_GRADES.length - 1)
  );

  return [roleSelector, gradeNavigation, buildNavRow(guildId, 1)];
}

function getStep2Config(guildId) {
  return {
    suggestionsEnabled: Boolean(getGuildSetting(guildId, 'channels', 'suggestions_enabled', true)),
    serverListEnabled: Boolean(getGuildSetting(guildId, 'channels', 'server_list_enabled', false)),
    statusBotEnabled: Boolean(getGuildSetting(guildId, 'channels', 'status_bot_enabled', true)),
    afkEnabled: Boolean(getGuildSetting(guildId, 'channels', 'afk_enabled', true)),
    gameUpdatesEnabled: Boolean(getGuildSetting(guildId, 'channels', 'game_updates_enabled', true))
  };
}

function setStep2Config(guildId, config) {
  setGuildSetting(guildId, 'channels', 'suggestions_enabled', config.suggestionsEnabled);
  setGuildSetting(guildId, 'channels', 'server_list_enabled', config.serverListEnabled);
  setGuildSetting(guildId, 'channels', 'status_bot_enabled', config.statusBotEnabled);
  setGuildSetting(guildId, 'channels', 'afk_enabled', config.afkEnabled);
  setGuildSetting(guildId, 'channels', 'game_updates_enabled', config.gameUpdatesEnabled);
}

function buildStep2Content(guildId) {
  const c = getStep2Config(guildId);
  return [
    `## ${t('setup.step2Title', {}, { guildId })} (2/${TOTAL_STEPS})`,
    t('setup.step2Instructions', {}, { guildId }),
    '',
    `💡 **Suggestions** : ${onOff(c.suggestionsEnabled, guildId)}`,
    `🖥️ **Liste serveurs** : ${onOff(c.serverListEnabled, guildId)}`,
    `🤖 **Statut bot** : ${onOff(c.statusBotEnabled, guildId)}`,
    `🔇 **Vocal AFK** : ${onOff(c.afkEnabled, guildId)}`,
    `🎮 **Game Updates** : ${onOff(c.gameUpdatesEnabled, guildId)}`
  ].join('\n');
}

function buildStep2Components(guildId) {
  const c = getStep2Config(guildId);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleSuggestions).setStyle(ButtonStyle.Secondary)
      .setLabel(`💡 Suggestions: ${onOff(c.suggestionsEnabled, guildId)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleServerList).setStyle(ButtonStyle.Secondary)
      .setLabel(`🖥️ Serveurs: ${onOff(c.serverListEnabled, guildId)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleStatusBot).setStyle(ButtonStyle.Secondary)
      .setLabel(`🤖 Statut: ${onOff(c.statusBotEnabled, guildId)}`)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleAfk).setStyle(ButtonStyle.Secondary)
      .setLabel(`🔇 AFK: ${onOff(c.afkEnabled, guildId)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleGameUpdates).setStyle(ButtonStyle.Secondary)
      .setLabel(`🎮 Game Updates: ${onOff(c.gameUpdatesEnabled, guildId)}`)
  );
  return [row, row2, buildNavRow(guildId, 2)];
}

function getStep3Config(guildId) {
  return {
    promotionDelayHours: Math.max(12, Number(getGuildSetting(guildId, 'members', 'promotion_delay_hours', 48))),
    bioRequired: Boolean(getGuildSetting(guildId, 'members', 'bio_required', false)),
    sponsorshipRequired: Boolean(getGuildSetting(guildId, 'members', 'sponsorship_required', false)),
    reviewerGrade: getGuildSetting(guildId, 'members', 'promotion_review_grade', GRADE_NAMES.moderateur),
    inviteExpulsionEnabled: Boolean(getGuildSetting(guildId, 'members', 'invite_expulsion_enabled', true)),
    inviteExpulsionDays: Math.max(1, Number(getGuildSetting(guildId, 'members', 'invite_expulsion_days', 30)))
  };
}

function setStep3Config(guildId, config) {
  setGuildSetting(guildId, 'members', 'promotion_delay_hours', config.promotionDelayHours);
  setGuildSetting(guildId, 'members', 'bio_required', config.bioRequired);
  setGuildSetting(guildId, 'members', 'sponsorship_required', config.sponsorshipRequired);
  setGuildSetting(guildId, 'members', 'promotion_review_grade', config.reviewerGrade);
  setGuildSetting(guildId, 'members', 'invite_expulsion_enabled', config.inviteExpulsionEnabled);
  setGuildSetting(guildId, 'members', 'invite_expulsion_days', config.inviteExpulsionDays);
}

function cycleReviewerGrade(currentGrade) {
  const sequence = [GRADE_NAMES.moderateur, GRADE_NAMES.manager, GRADE_NAMES.owner];
  const idx = sequence.indexOf(currentGrade);
  return sequence[idx < 0 ? 0 : (idx + 1) % sequence.length];
}

function buildStep3Content(guildId) {
  const c = getStep3Config(guildId);
  return [
    `## ${t('setup.step3Title', {}, { guildId })} (3/${TOTAL_STEPS})`,
    t('setup.step3Instructions', {}, { guildId }),
    '',
    `⏱️ **Délai promotion** : ${c.promotionDelayHours}h`,
    `📝 **Bio obligatoire** : ${boolText(c.bioRequired, guildId)}`,
    `👥 **Parrainage** : ${boolText(c.sponsorshipRequired, guildId)}`,
    `🔍 **Grade réviseur** : ${gradeLabel(c.reviewerGrade)}`,
    `🚪 **Expulsion invités** : ${boolText(c.inviteExpulsionEnabled, guildId)} (après ${c.inviteExpulsionDays}j)`
  ].join('\n');
}

function buildStep3Components(guildId) {
  const c = getStep3Config(guildId);
  const toggles = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleBioRequired).setStyle(ButtonStyle.Secondary)
      .setLabel(`Bio: ${boolText(c.bioRequired, guildId)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleSponsorshipRequired).setStyle(ButtonStyle.Secondary)
      .setLabel(`Parrainage: ${boolText(c.sponsorshipRequired, guildId)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.cyclePromotionReviewerGrade).setStyle(ButtonStyle.Secondary)
      .setLabel(`Réviseur: ${gradeLabel(c.reviewerGrade)}`)
  );
  const delay = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreasePromotionDelay).setStyle(ButtonStyle.Secondary).setLabel('-12h'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increasePromotionDelay).setStyle(ButtonStyle.Secondary).setLabel('+12h')
  );
  const expulsion = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleInviteExpulsion).setStyle(ButtonStyle.Secondary)
      .setLabel(`Expulsion: ${boolText(c.inviteExpulsionEnabled, guildId)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseInviteExpulsionDays).setStyle(ButtonStyle.Secondary).setLabel('-1j'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseInviteExpulsionDays).setStyle(ButtonStyle.Secondary).setLabel('+1j')
  );
  return [toggles, delay, expulsion, buildNavRow(guildId, 3)];
}

function getStep4Cursor(guildId) {
  const cursor = getGuildSetting(guildId, 'setup', 'game_cursor', 0);
  return Number.isInteger(cursor) ? Math.max(0, cursor) : 0;
}

function setStep4Cursor(guildId, cursor) {
  const safeCursor = Math.max(0, cursor);
  setGuildSetting(guildId, 'setup', 'game_cursor', safeCursor);
  return safeCursor;
}

function ensureAtLeastOneSetupGame(guildId) {
  const games = listSetupGames(guildId);
  if (games.length > 0) return games;
  addSetupGame(guildId);
  return listSetupGames(guildId);
}

function getSteamCycleValue(value) {
  const sequence = [null, '440', '570', '730', '578080'];
  const idx = sequence.indexOf(value || null);
  return sequence[idx < 0 ? 0 : (idx + 1) % sequence.length];
}

function buildStep4Content(guildId) {
  const games = ensureAtLeastOneSetupGame(guildId);
  const rawCursor = getStep4Cursor(guildId);
  const cursor = Math.min(rawCursor, games.length - 1);
  if (rawCursor !== cursor) setStep4Cursor(guildId, cursor);
  const current = games[cursor];
  const summary = games.map((game, i) => {
    const marker = i === cursor ? '▶' : '—';
    return `${marker} **${game.name}** | steam=${game.steam_app_id || 'none'} | galerie=${onOff(Boolean(game.galerie_enabled), guildId)} | changelog=${onOff(Boolean(game.changelog_enabled), guildId)}`;
  }).join('\n');
  return [
    `## ${t('setup.step4Title', {}, { guildId })} (4/${TOTAL_STEPS})`,
    t('setup.step4Instructions', {}, { guildId }),
    `> Jeu sélectionné : **${current.name}**`,
    '',
    summary
  ].join('\n');
}

function buildStep4Components(guildId) {
  const games = ensureAtLeastOneSetupGame(guildId);
  const rawCursor = getStep4Cursor(guildId);
  const cursor = Math.min(rawCursor, games.length - 1);
  if (rawCursor !== cursor) setStep4Cursor(guildId, cursor);
  const current = games[cursor];
  const listActions = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.addGame).setStyle(ButtonStyle.Secondary).setLabel('➕ Ajouter jeu'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.removeLastGame).setStyle(ButtonStyle.Secondary).setLabel('🗑️ Supprimer dernier').setDisabled(games.length <= 1)
  );
  const nav = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.previousGame).setStyle(ButtonStyle.Secondary).setLabel('◀ Précédent').setDisabled(cursor === 0),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.nextGameItem).setStyle(ButtonStyle.Secondary).setLabel('Suivant ▶').setDisabled(cursor >= games.length - 1)
  );
  const toggles = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleGameGallery).setStyle(ButtonStyle.Secondary)
      .setLabel(`Galerie: ${onOff(Boolean(current.galerie_enabled), guildId)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleGameChangelog).setStyle(ButtonStyle.Secondary)
      .setLabel(`Changelog: ${onOff(Boolean(current.changelog_enabled), guildId)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.cycleGameAppId).setStyle(ButtonStyle.Secondary)
      .setLabel(`Steam ID: ${current.steam_app_id || 'none'}`)
  );
  return [listActions, nav, toggles, buildNavRow(guildId, 4)];
}

function getStep5Config(guildId) {
  return {
    behaviorScoreEnabled: Boolean(getGuildSetting(guildId, 'moderation', 'behavior_score_enabled', true)),
    spamThreshold: Math.max(2, Number(getGuildSetting(guildId, 'automod', 'spam_threshold', 5))),
    blacklistWarn: getGuildSetting(guildId, 'automod', 'blacklist_mode', 'warn') === 'warn'
  };
}

function setStep5Config(guildId, config) {
  setGuildSetting(guildId, 'moderation', 'behavior_score_enabled', config.behaviorScoreEnabled);
  setGuildSetting(guildId, 'automod', 'spam_threshold', config.spamThreshold);
  setGuildSetting(guildId, 'automod', 'blacklist_mode', config.blacklistWarn ? 'warn' : 'silent');
}

function buildStep5Content(guildId) {
  const c = getStep5Config(guildId);
  return [
    `## ${t('setup.step5Title', {}, { guildId })} (5/${TOTAL_STEPS})`,
    t('setup.step5Instructions', {}, { guildId }),
    '',
    `⚖️ **Score comportemental** : ${boolText(c.behaviorScoreEnabled, guildId)}`,
    `🛡️ **Anti-spam** : max ${c.spamThreshold} messages/10s`,
    `🚫 **Blacklist** : ${c.blacklistWarn ? '⚠️ Avertissement public' : '🤫 Suppression silencieuse'}`
  ].join('\n');
}

function buildStep5Components(guildId) {
  const c = getStep5Config(guildId);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleBehaviorScore).setStyle(ButtonStyle.Secondary)
      .setLabel(`⚖️ Score: ${boolText(c.behaviorScoreEnabled, guildId)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleBlacklistWarn).setStyle(ButtonStyle.Secondary)
      .setLabel(`🚫 Blacklist: ${c.blacklistWarn ? 'Warn' : 'Silent'}`)
  );
  const spamRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseSpamThreshold).setStyle(ButtonStyle.Secondary).setLabel('-1 msg/spam'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseSpamThreshold).setStyle(ButtonStyle.Secondary).setLabel('+1 msg/spam')
  );
  return [row, spamRow, buildNavRow(guildId, 5)];
}

function buildStep6Summary(guildId) {
  const mappings = getGradeMappings(guildId);
  const modules = getStep2Config(guildId);
  const members = getStep3Config(guildId);
  const games = listSetupGames(guildId);
  const mod = getStep5Config(guildId);

  return [
    `## ${t('setup.step6Title', {}, { guildId })} (6/${TOTAL_STEPS})`,
    t('setup.step6Instructions', {}, { guildId }),
    '',
    `**Grades mappés** : ${Object.keys(mappings).length}/5`,
    '',
    '**Modules**',
    `  💡 Suggestions: ${onOff(modules.suggestionsEnabled, guildId)}`,
    `  🖥️ Liste serveurs: ${onOff(modules.serverListEnabled, guildId)}`,
    `  🤖 Statut bot: ${onOff(modules.statusBotEnabled, guildId)}`,
    `  🔇 AFK: ${onOff(modules.afkEnabled, guildId)}`,
    `  🎮 Game Updates: ${onOff(modules.gameUpdatesEnabled, guildId)}`,
    '',
    '**Membres**',
    `  ⏱️ Délai promotion: ${members.promotionDelayHours}h`,
    `  📝 Bio: ${boolText(members.bioRequired, guildId)} | 👥 Parrainage: ${boolText(members.sponsorshipRequired, guildId)}`,
    '',
    `**Jeux configurés** : ${games.length}`,
    '',
    '**Modération**',
    `  ⚖️ Score: ${boolText(mod.behaviorScoreEnabled, guildId)}`,
    `  🛡️ Spam max: ${mod.spamThreshold}/10s`,
    `  🚫 Blacklist: ${mod.blacklistWarn ? 'warn' : 'silent'}`,
    '',
    `> ⚠️ ${t('setup.step6ConfirmWarning', {}, { guildId })}`
  ].join('\n');
}

function buildStep6Components(guildId) {
  return [buildNavRow(guildId, TOTAL_STEPS)];
}

function buildStepPayload(guildId, guild, step) {
  switch (step) {
    case 1: return { content: buildStepOneContent(guildId, guild), components: buildStepOneComponents(guildId, guild) };
    case 2: return { content: buildStep2Content(guildId), components: buildStep2Components(guildId) };
    case 3: return { content: buildStep3Content(guildId), components: buildStep3Components(guildId) };
    case 4: return { content: buildStep4Content(guildId), components: buildStep4Components(guildId) };
    case 5: return { content: buildStep5Content(guildId), components: buildStep5Components(guildId) };
    default: return { content: buildStep6Summary(guildId), components: buildStep6Components(guildId) };
  }
}

async function renderStep(interaction, step) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  const payload = buildStepPayload(guildId, guild, step);
  await interaction.message.edit(payload);
  await interaction.deferUpdate().catch(() => {});
}

async function startWizardInChannel(interaction) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  setGuildSetting(guildId, 'setup', 'step', 1);
  setGradeCursor(guildId, 0);
  const payload = buildStepPayload(guildId, guild, 1);
  await interaction.message.edit(payload);
  await interaction.deferUpdate().catch(() => {});
}

function explainStepOneValidation(guildId, validation) {
  if (validation.reason === 'missing_mappings') {
    const missing = validation?.details?.missingGrades || [];
    return t('setup.validationMissingMappings', { grades: missing.map(gradeLabel).join(', ') }, { guildId });
  }
  if (validation.reason === 'duplicate_roles') return t('setup.validationDuplicateRoles', {}, { guildId });
  if (validation.reason === 'owner_role_missing') return t('setup.validationOwnerRoleMissing', {}, { guildId });
  if (validation.reason === 'owner_cardinality') return t('setup.validationOwnerCardinality', { count: validation?.details?.ownerCount ?? 0 }, { guildId });
  return t('setup.validationGenericError', {}, { guildId });
}

async function handleSetupInteraction(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) return false;
  if (!interaction.customId || !interaction.customId.startsWith('setup:')) return false;

  const setupOwnerId = getGuildSetting(guildId, 'setup', 'owner_id', null);
  if (setupOwnerId && interaction.user.id !== setupOwnerId) {
    if (interaction.isRepliable()) await replyEphemeral(interaction, t('setup.forbiddenNotOwner', {}, { guildId }));
    return true;
  }


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

  if (interaction.customId === CUSTOM_IDS.createRolesAuto) {
    await interaction.deferUpdate();
    const roleColors = {
      [GRADE_NAMES.invite]: 0x95a5a6,
      [GRADE_NAMES.membre]: 0x3498db,
      [GRADE_NAMES.moderateur]: 0x2ecc71,
      [GRADE_NAMES.manager]: 0xe67e22,
      [GRADE_NAMES.owner]: 0xe74c3c
    };
    for (const grade of ORDERED_GRADES) {
      try {
        const role = await interaction.guild.roles.create({
          name: gradeLabel(grade),
          color: roleColors[grade] ?? 0x99aab5,
          reason: 'Guardian setup — création automatique des rôles'
        });
        setGradeRole(guildId, grade, role.id);
      } catch (err) {
        logger.error(`Failed to create role for grade ${grade}`, err);
      }
    }
    setGradeCursor(guildId, 0);
    await renderStep(interaction, 1);
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
    await renderStep(interaction, 1);
    return true;
  }

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

  if (interaction.customId === CUSTOM_IDS.toggleBioRequired) {
    const c = getStep3Config(guildId); c.bioRequired = !c.bioRequired; setStep3Config(guildId, c);
    await renderStep(interaction, 3); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleSponsorshipRequired) {
    const c = getStep3Config(guildId); c.sponsorshipRequired = !c.sponsorshipRequired; setStep3Config(guildId, c);
    await renderStep(interaction, 3); return true;
  }
  if (interaction.customId === CUSTOM_IDS.decreasePromotionDelay) {
    const c = getStep3Config(guildId); c.promotionDelayHours = Math.max(12, c.promotionDelayHours - 12); setStep3Config(guildId, c);
    await renderStep(interaction, 3); return true;
  }
  if (interaction.customId === CUSTOM_IDS.increasePromotionDelay) {
    const c = getStep3Config(guildId); c.promotionDelayHours = Math.min(24 * 60, c.promotionDelayHours + 12); setStep3Config(guildId, c);
    await renderStep(interaction, 3); return true;
  }
  if (interaction.customId === CUSTOM_IDS.cyclePromotionReviewerGrade) {
    const c = getStep3Config(guildId); c.reviewerGrade = cycleReviewerGrade(c.reviewerGrade); setStep3Config(guildId, c);
    await renderStep(interaction, 3); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleInviteExpulsion) {
    const c = getStep3Config(guildId); c.inviteExpulsionEnabled = !c.inviteExpulsionEnabled; setStep3Config(guildId, c);
    await renderStep(interaction, 3); return true;
  }
  if (interaction.customId === CUSTOM_IDS.decreaseInviteExpulsionDays) {
    const c = getStep3Config(guildId); c.inviteExpulsionDays = Math.max(1, c.inviteExpulsionDays - 1); setStep3Config(guildId, c);
    await renderStep(interaction, 3); return true;
  }
  if (interaction.customId === CUSTOM_IDS.increaseInviteExpulsionDays) {
    const c = getStep3Config(guildId); c.inviteExpulsionDays = Math.min(365, c.inviteExpulsionDays + 1); setStep3Config(guildId, c);
    await renderStep(interaction, 3); return true;
  }

  if (interaction.customId === CUSTOM_IDS.addGame) {
    addSetupGame(guildId);
    const games = listSetupGames(guildId);
    setStep4Cursor(guildId, games.length - 1);
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.removeLastGame) {
    removeLastSetupGame(guildId);
    const games = ensureAtLeastOneSetupGame(guildId);
    setStep4Cursor(guildId, Math.min(getStep4Cursor(guildId), games.length - 1));
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.previousGame) {
    setStep4Cursor(guildId, getStep4Cursor(guildId) - 1);
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.nextGameItem) {
    setStep4Cursor(guildId, getStep4Cursor(guildId) + 1);
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleGameGallery) {
    const games = ensureAtLeastOneSetupGame(guildId);
    const cursor = Math.min(getStep4Cursor(guildId), games.length - 1);
    updateSetupGame(guildId, games[cursor].game_id, { galerie_enabled: !Boolean(games[cursor].galerie_enabled) });
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleGameChangelog) {
    const games = ensureAtLeastOneSetupGame(guildId);
    const cursor = Math.min(getStep4Cursor(guildId), games.length - 1);
    updateSetupGame(guildId, games[cursor].game_id, { changelog_enabled: !Boolean(games[cursor].changelog_enabled) });
    await renderStep(interaction, 4); return true;
  }
  if (interaction.customId === CUSTOM_IDS.cycleGameAppId) {
    const games = ensureAtLeastOneSetupGame(guildId);
    const cursor = Math.min(getStep4Cursor(guildId), games.length - 1);
    updateSetupGame(guildId, games[cursor].game_id, { steam_app_id: getSteamCycleValue(games[cursor].steam_app_id) });
    await renderStep(interaction, 4); return true;
  }

  if (interaction.customId === CUSTOM_IDS.toggleBehaviorScore) {
    const c = getStep5Config(guildId); c.behaviorScoreEnabled = !c.behaviorScoreEnabled; setStep5Config(guildId, c);
    await renderStep(interaction, 5); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleBlacklistWarn) {
    const c = getStep5Config(guildId); c.blacklistWarn = !c.blacklistWarn; setStep5Config(guildId, c);
    await renderStep(interaction, 5); return true;
  }
  if (interaction.customId === CUSTOM_IDS.decreaseSpamThreshold) {
    const c = getStep5Config(guildId); c.spamThreshold = Math.max(2, c.spamThreshold - 1); setStep5Config(guildId, c);
    await renderStep(interaction, 5); return true;
  }
  if (interaction.customId === CUSTOM_IDS.increaseSpamThreshold) {
    const c = getStep5Config(guildId); c.spamThreshold = Math.min(20, c.spamThreshold + 1); setStep5Config(guildId, c);
    await renderStep(interaction, 5); return true;
  }

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
      const validation = validateStepOneMappings(interaction.guild);
      if (!validation.ok) {
        await replyEphemeral(interaction, explainStepOneValidation(guildId, validation));
        return true;
      }
    }

    const nextStep = Math.min(currentStep + 1, TOTAL_STEPS);
    setGuildSetting(guildId, 'setup', 'step', nextStep);
    await renderStep(interaction, nextStep);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.finalize) {
    if (getCurrentStep(guildId) < TOTAL_STEPS) {
      await replyEphemeral(interaction, t('setup.step5NotReady', {}, { guildId }));
      return true;
    }
    if (!interaction.guild) return true;

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
  handleSetupInteraction,
  startWizardInChannel
};
