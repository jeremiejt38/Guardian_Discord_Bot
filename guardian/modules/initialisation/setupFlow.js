const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
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

async function sendSetupMessage(interaction, content) {
  if (interaction.channel?.send) {
    await interaction.channel.send({ content });
    await interaction.deferUpdate().catch(() => {});
  } else {
    await replyEphemeral(interaction, content);
  }
}

const TOTAL_STEPS = 8;

const CUSTOM_IDS = Object.freeze({
  start: 'setup:start',
  createRolesAuto: 'setup:grade:create-auto',
  renameGradePrefix: 'setup:grade:rename',
  renameGradeModal: 'setup:grade:rename:modal',
  selectOwnerMember: 'setup:grade:owner-member',
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
  editVocalPrefix: 'setup:vocal:prefix:edit',
  editVocalSuffix: 'setup:vocal:suffix:edit',
  decreaseVocalLimit: 'setup:vocal:limit:dec',
  increaseVocalLimit: 'setup:vocal:limit:inc',
  decreaseVocalDelay: 'setup:vocal:delay:dec',
  increaseVocalDelay: 'setup:vocal:delay:inc',
  cycleVocalPrefix: 'setup:vocal:prefix:cycle',
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
  addBlacklistWord: 'setup:mod:blacklist:add',
  blacklistModal: 'setup:mod:blacklist:modal',
  clearBlacklist: 'setup:mod:blacklist:clear',
  decreaseSlowMode: 'setup:mod:slowmode:dec',
  increaseSlowMode: 'setup:mod:slowmode:inc',
  cycleLogsLevel: 'setup:mod:logs:cycle',
  editWelcomeText: 'setup:members:welcome:edit',
  welcomeModal: 'setup:members:welcome:modal',
  channelSelectPrefix: 'setup:channel:select',
  channelSkip: 'setup:channel:skip',
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
      .setLabel(t('setup.nextStep', {}, { guildId }))
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

function getRolesAutoCreated(guildId) {
  return Boolean(getGuildSetting(guildId, 'setup', 'roles_auto_created', false));
}

function getGradeRenameMap(guildId) {
  const stored = getGuildSetting(guildId, 'setup', 'grade_rename_map', {});
  return stored && typeof stored === 'object' ? stored : {};
}

function setGradeRenameName(guildId, grade, name) {
  const map = getGradeRenameMap(guildId);
  map[grade] = name;
  setGuildSetting(guildId, 'setup', 'grade_rename_map', map);
}

function isFreshInstall(guildId) {
  return Boolean(getGuildSetting(guildId, 'setup', 'fresh_install', false));
}

function buildStepOneContent(guildId, guild) {
  const mappings = getGradeMappings(guildId);
  const autoCreated = getRolesAutoCreated(guildId);
  const noRoles = !hasMapableRoles(guild) || isFreshInstall(guildId);
  const lines = [
    `## ${t('setup.step1Title', {}, { guildId })} (1/${TOTAL_STEPS})`
  ];

  if (autoCreated) {
    const renameMap = getGradeRenameMap(guildId);
    lines.push(t('setup.step1RenameDesc', {}, { guildId }));
    lines.push('');
    for (const grade of ORDERED_GRADES) {
      const roleId = mappings[grade];
      const roleName = renameMap[grade] || gradeLabel(grade);
      lines.push(`🏷️ **${gradeLabel(grade)}** → \`${roleName}\`` + (roleId ? ` <@&${roleId}>` : ''));
    }
  } else if (noRoles) {
    lines.push(t('setup.step1NoRolesDesc', {}, { guildId }));
  } else {
    const cursor = getGradeCursor(guildId);
    const currentGrade = ORDERED_GRADES[cursor];
    const summary = ORDERED_GRADES.map((grade) => {
      const roleId = mappings[grade];
      const marker = roleId ? '✅' : '❌';
      const roleText = roleId ? `<@&${roleId}>` : '-';
      return `${marker} **${gradeLabel(grade)}** → ${roleText}`;
    }).join('\n');
    lines.push(t('setup.step1Instructions', {}, { guildId }));
    lines.push(`> ${t('setup.step1CurrentGrade', { grade: gradeLabel(currentGrade) }, { guildId })}`);
    lines.push('');
    lines.push(summary);
  }

  return lines.join('\n');
}

function buildStepOneComponents(guildId, guild) {
  const noRoles = !hasMapableRoles(guild) || isFreshInstall(guildId);
  if (getRolesAutoCreated(guildId)) {
    const rows = [];
    for (let i = 0; i < ORDERED_GRADES.length; i += 3) {
      const slice = ORDERED_GRADES.slice(i, i + 3);
      const row = new ActionRowBuilder().addComponents(
        slice.map((grade) =>
          new ButtonBuilder()
            .setCustomId(`${CUSTOM_IDS.renameGradePrefix}:${grade}`)
            .setStyle(ButtonStyle.Secondary)
            .setLabel(`✏️ ${gradeLabel(grade)}`)
        )
      );
      rows.push(row);
    }
    rows.push(buildNavRow(guildId, 1));
    return rows;
  }

  if (noRoles) {
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

const CHANNEL_SLOTS = Object.freeze([
  { key: 'rules', label: '#règles', settingSection: 'channels', settingKey: 'rules_channel_id', emoji: '📜' },
  { key: 'announcements', label: '#annonces', settingSection: 'channels', settingKey: 'announcements_channel_id', emoji: '📢' },
  { key: 'welcome', label: '#bienvenue', settingSection: 'channels', settingKey: 'welcome_channel_id', emoji: '👋' },
  { key: 'general', label: '#général', settingSection: 'channels', settingKey: 'general_channel_id', emoji: '💬' },
  { key: 'voiceGeneral', label: '🔊 Vocal Général', settingSection: 'channels', settingKey: 'voice_general_id', emoji: '🔊' },
  { key: 'voiceAfk', label: '🔇 Vocal AFK', settingSection: 'channels', settingKey: 'voice_afk_id', emoji: '🔇' }
]);

function getChannelCursor(guildId) {
  const cursor = getGuildSetting(guildId, 'setup', 'channel_cursor', 0);
  return Number.isInteger(cursor) ? Math.min(Math.max(cursor, 0), CHANNEL_SLOTS.length - 1) : 0;
}

function setChannelCursor(guildId, cursor) {
  const safe = Math.min(Math.max(cursor, 0), CHANNEL_SLOTS.length - 1);
  setGuildSetting(guildId, 'setup', 'channel_cursor', safe);
  return safe;
}

function scanExistingChannels(guild) {
  const textChannels = guild.channels.cache.filter((c) => c.isTextBased && c.isTextBased() && !c.isVoiceBased());
  const voiceChannels = guild.channels.cache.filter((c) => c.isVoiceBased && c.isVoiceBased());
  return { textChannels, voiceChannels };
}

function buildChannelOptions(guild, slot) {
  const isVoice = slot.key.startsWith('voice');
  const allChannels = Array.from(guild.channels.cache.values());
  const channels = allChannels
    .filter((c) => isVoice ? (c.isVoiceBased && c.isVoiceBased()) : (c.isTextBased && c.isTextBased() && !c.isVoiceBased()))
    .map((c) => ({ label: `${c.name}`.slice(0, 25), value: c.id, description: `ID: ${c.id}`.slice(0, 50) }))
    .slice(0, 25);
  return channels.length > 0 ? channels : [{ label: 'Aucun channel compatible', value: 'none', description: 'Guardian en créera un automatiquement' }];
}

function buildStep3ChannelsContent(guildId, guild) {
  const cursor = getChannelCursor(guildId);
  const slot = CHANNEL_SLOTS[cursor];
  const currentId = getGuildSetting(guildId, slot.settingSection, slot.settingKey, null);
  const currentChannel = currentId && guild ? guild.channels.cache.get(currentId) : null;
  const statusLines = CHANNEL_SLOTS.map((s, i) => {
    const id = getGuildSetting(guildId, s.settingSection, s.settingKey, null);
    const ch = id && guild ? guild.channels.cache.get(id) : null;
    const marker = i === cursor ? '▶' : (ch ? '✅' : '—');
    return `${marker} ${s.emoji} **${s.label}** ${ch ? `→ #${ch.name}` : '*à configurer*'}`;
  }).join('\n');

  return [
    `## ${t('setup.step3Title', {}, { guildId })} (3/${TOTAL_STEPS})`,
    t('setup.step3Instructions', {}, { guildId }),
    '',
    statusLines,
    '',
    `> Configuration en cours : **${slot.emoji} ${slot.label}**`,
    currentChannel ? `> Actuellement lié à : #${currentChannel.name}` : '> Non configuré — choisir un channel existant ou laisser Guardian le créer'
  ].join('\n');
}

function buildStep3ChannelsComponents(guildId, guild) {
  const cursor = getChannelCursor(guildId);
  const slot = CHANNEL_SLOTS[cursor];
  const options = buildChannelOptions(guild, slot);
  const hasNone = options.length === 1 && options[0].value === 'none';

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`${CUSTOM_IDS.channelSelectPrefix}:${slot.key}`)
    .setPlaceholder(`Lier un ${slot.label} existant`)
    .setDisabled(hasNone)
    .addOptions(options);

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${CUSTOM_IDS.channelSkip}:prev`).setStyle(ButtonStyle.Secondary)
      .setLabel('◀ Précédent').setDisabled(cursor === 0),
    new ButtonBuilder().setCustomId(`${CUSTOM_IDS.channelSkip}:next`).setStyle(ButtonStyle.Secondary)
      .setLabel('Laisser Guardian créer →').setDisabled(false),
    new ButtonBuilder().setCustomId(`${CUSTOM_IDS.channelSkip}:skip`).setStyle(ButtonStyle.Secondary)
      .setLabel('Passer tous restants →')
  );

  return [selectRow, navRow, buildNavRow(guildId, 3)];
}

function getStep4Config(guildId) {
  return {
    promotionDelayHours: Math.max(12, Number(getGuildSetting(guildId, 'members', 'promotion_delay_hours', 48))),
    bioRequired: Boolean(getGuildSetting(guildId, 'members', 'bio_required', false)),
    sponsorshipRequired: Boolean(getGuildSetting(guildId, 'members', 'sponsorship_required', false)),
    reviewerGrade: getGuildSetting(guildId, 'members', 'promotion_review_grade', GRADE_NAMES.moderateur),
    inviteExpulsionEnabled: Boolean(getGuildSetting(guildId, 'members', 'invite_expulsion_enabled', true)),
    inviteExpulsionDays: Math.max(1, Number(getGuildSetting(guildId, 'members', 'invite_expulsion_days', 30))),
    welcomeText: String(getGuildSetting(guildId, 'members', 'welcome_text', '') || '')
  };
}

function setStep4Config(guildId, config) {
  setGuildSetting(guildId, 'members', 'promotion_delay_hours', config.promotionDelayHours);
  setGuildSetting(guildId, 'members', 'bio_required', config.bioRequired);
  setGuildSetting(guildId, 'members', 'sponsorship_required', config.sponsorshipRequired);
  setGuildSetting(guildId, 'members', 'promotion_review_grade', config.reviewerGrade);
  setGuildSetting(guildId, 'members', 'invite_expulsion_enabled', config.inviteExpulsionEnabled);
  setGuildSetting(guildId, 'members', 'invite_expulsion_days', config.inviteExpulsionDays);
  setGuildSetting(guildId, 'members', 'welcome_text', config.welcomeText);
}

function cycleReviewerGrade(currentGrade) {
  const sequence = [GRADE_NAMES.moderateur, GRADE_NAMES.manager, GRADE_NAMES.owner];
  const idx = sequence.indexOf(currentGrade);
  return sequence[idx < 0 ? 0 : (idx + 1) % sequence.length];
}

function buildStep4Content(guildId) {
  const c = getStep4Config(guildId);
  const welcomePreview = c.welcomeText ? `"${c.welcomeText.slice(0, 60)}${c.welcomeText.length > 60 ? '…' : ''}"` : '*non défini*';
  return [
    `## ${t('setup.step4Title', {}, { guildId })} (4/${TOTAL_STEPS})`,
    t('setup.step4Instructions', {}, { guildId }),
    '',
    `⏱️ **Délai promotion** : ${c.promotionDelayHours}h`,
    `📝 **Bio obligatoire** : ${boolText(c.bioRequired, guildId)}`,
    `👥 **Parrainage** : ${boolText(c.sponsorshipRequired, guildId)}`,
    `🔍 **Grade réviseur** : ${gradeLabel(c.reviewerGrade)}`,
    `🚪 **Expulsion invités** : ${boolText(c.inviteExpulsionEnabled, guildId)} (après ${c.inviteExpulsionDays}j)`,
    `💬 **Message de bienvenue** : ${welcomePreview}`
  ].join('\n');
}

function buildStep4Components(guildId) {
  const c = getStep4Config(guildId);
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
  const welcomeBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.editWelcomeText).setStyle(ButtonStyle.Secondary)
      .setLabel('💬 Modifier message de bienvenue')
  );
  return [toggles, delay, expulsion, welcomeBtn, buildNavRow(guildId, 4)];
}

function getStep4VocalConfig(guildId) {
  return {
    prefix: String(getGuildSetting(guildId, 'vocal', 'prefix', '🎮') || '🎮'),
    suffix: String(getGuildSetting(guildId, 'vocal', 'suffix', '— Partie') || '— Partie'),
    memberLimit: Math.max(0, Number(getGuildSetting(guildId, 'vocal', 'member_limit', 0))),
    deleteDelayMinutes: Math.max(1, Number(getGuildSetting(guildId, 'vocal', 'delete_delay_minutes', 5)))
  };
}

const VOCAL_PREFIX_CYCLE = ['🎮', '🎯', '🔊', '⚔️', '🏆', '🎲'];

function cycleVocalPrefix(current) {
  const idx = VOCAL_PREFIX_CYCLE.indexOf(current);
  return VOCAL_PREFIX_CYCLE[(idx < 0 ? 0 : idx + 1) % VOCAL_PREFIX_CYCLE.length];
}

function buildStep5VocalContent(guildId) {
  const c = getStep4VocalConfig(guildId);
  const limitDisplay = c.memberLimit === 0 ? 'illimité' : `${c.memberLimit} membres max`;
  return [
    `## ${t('setup.step5Title', {}, { guildId })} (5/${TOTAL_STEPS})`,
    t('setup.step5Instructions', {}, { guildId }),
    '',
    `🔊 **Préfixe des salons vocaux** : ${c.prefix}`,
    `📛 **Suffixe** : ${c.suffix}`,
    `👥 **Limite de membres** : ${limitDisplay}`,
    `⏱️ **Délai de suppression** : ${c.deleteDelayMinutes} min`
  ].join('\n');
}

function buildStep5VocalComponents(guildId) {
  const c = getStep4VocalConfig(guildId);
  const limitDisplay = c.memberLimit === 0 ? '∞' : String(c.memberLimit);
  const prefixRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.cycleVocalPrefix).setStyle(ButtonStyle.Secondary)
      .setLabel(`Préfixe: ${c.prefix} →`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.editVocalSuffix).setStyle(ButtonStyle.Secondary)
      .setLabel(`Suffixe: ${c.suffix.slice(0, 20)}`)
  );
  const limitRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseVocalLimit).setStyle(ButtonStyle.Secondary).setLabel('Limite -1')
      .setDisabled(c.memberLimit === 0),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseVocalLimit).setStyle(ButtonStyle.Secondary).setLabel(`Limite +1 (${limitDisplay})`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseVocalDelay).setStyle(ButtonStyle.Secondary).setLabel('-1 min')
      .setDisabled(c.deleteDelayMinutes <= 1),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseVocalDelay).setStyle(ButtonStyle.Secondary).setLabel(`+1 min (${c.deleteDelayMinutes}min)`)
  );
  return [prefixRow, limitRow, buildNavRow(guildId, 5)];
}

function getStep5Cursor(guildId) {
  const cursor = getGuildSetting(guildId, 'setup', 'game_cursor', 0);
  return Number.isInteger(cursor) ? Math.max(0, cursor) : 0;
}

function setStep5Cursor(guildId, cursor) {
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

function buildStep6Content_Games(guildId) {
  const games = ensureAtLeastOneSetupGame(guildId);
  const rawCursor = getStep5Cursor(guildId);
  const cursor = Math.min(rawCursor, games.length - 1);
  if (rawCursor !== cursor) setStep5Cursor(guildId, cursor);
  const current = games[cursor];
  const summary = games.map((game, i) => {
    const marker = i === cursor ? '▶' : '—';
    return `${marker} **${game.name}** | steam=${game.steam_app_id || 'none'} | galerie=${onOff(Boolean(game.galerie_enabled), guildId)} | changelog=${onOff(Boolean(game.changelog_enabled), guildId)}`;
  }).join('\n');
  return [
    `## ${t('setup.step6Title', {}, { guildId })} (6/${TOTAL_STEPS})`,
    t('setup.step6Instructions', {}, { guildId }),
    `> Jeu sélectionné : **${current.name}**`,
    '',
    summary
  ].join('\n');
}

function buildStep6Components_Games(guildId) {
  const games = ensureAtLeastOneSetupGame(guildId);
  const rawCursor = getStep5Cursor(guildId);
  const cursor = Math.min(rawCursor, games.length - 1);
  if (rawCursor !== cursor) setStep5Cursor(guildId, cursor);
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
  return [listActions, nav, toggles, buildNavRow(guildId, 6)];
}

const LOGS_LEVELS = ['minimal', 'normal', 'verbose'];
function cycleLogsLevel(current) {
  const idx = LOGS_LEVELS.indexOf(current);
  return LOGS_LEVELS[(idx < 0 ? 1 : (idx + 1) % LOGS_LEVELS.length)];
}

function getStep7Config(guildId) {
  return {
    behaviorScoreEnabled: Boolean(getGuildSetting(guildId, 'moderation', 'behavior_score_enabled', true)),
    spamThreshold: Math.max(2, Number(getGuildSetting(guildId, 'automod', 'spam_threshold', 5))),
    slowModeSeconds: Math.max(0, Number(getGuildSetting(guildId, 'automod', 'slowmode_seconds', 0))),
    blacklistWarn: getGuildSetting(guildId, 'automod', 'blacklist_mode', 'warn') === 'warn',
    blacklistWords: (() => { const w = getGuildSetting(guildId, 'automod', 'blacklist_words', []); return Array.isArray(w) ? w : []; })(),
    logsEnabled: Boolean(getGuildSetting(guildId, 'logs', 'enabled', true)),
    logsLevel: getGuildSetting(guildId, 'logs', 'level', 'normal') || 'normal'
  };
}

function setStep7Config(guildId, config) {
  setGuildSetting(guildId, 'moderation', 'behavior_score_enabled', config.behaviorScoreEnabled);
  setGuildSetting(guildId, 'automod', 'spam_threshold', config.spamThreshold);
  setGuildSetting(guildId, 'automod', 'slowmode_seconds', config.slowModeSeconds);
  setGuildSetting(guildId, 'automod', 'blacklist_mode', config.blacklistWarn ? 'warn' : 'silent');
  setGuildSetting(guildId, 'automod', 'blacklist_words', config.blacklistWords);
  setGuildSetting(guildId, 'logs', 'enabled', config.logsEnabled);
  setGuildSetting(guildId, 'logs', 'level', config.logsLevel);
}

function buildStep7Content(guildId) {
  const c = getStep7Config(guildId);
  const wordList = c.blacklistWords.length > 0
    ? c.blacklistWords.slice(0, 8).map((w) => `\`${w}\``).join(', ') + (c.blacklistWords.length > 8 ? ` +${c.blacklistWords.length - 8}` : '')
    : '*aucun*';
  const slowDisplay = c.slowModeSeconds === 0 ? 'désactivé' : `${c.slowModeSeconds}s entre messages`;
  const logsDisplay = c.logsEnabled ? `✅ ${c.logsLevel}` : '❌';
  return [
    `## ${t('setup.step7Title', {}, { guildId })} (7/${TOTAL_STEPS})`,
    t('setup.step7Instructions', {}, { guildId }),
    '',
    `⚖️ **Score comportemental** : ${boolText(c.behaviorScoreEnabled, guildId)}`,
    `🛡️ **Anti-spam** : max ${c.spamThreshold} msg/3s`,
    `� **Slow mode** : ${slowDisplay}`,
    `🚫 **Blacklist** : ${c.blacklistWarn ? '⚠️ Warn public' : '🤫 Silencieux'} — mots: ${wordList}`,
    `📋 **Logs Guardian** : ${logsDisplay}`
  ].join('\n');
}

function buildStep7Components(guildId) {
  const c = getStep7Config(guildId);
  const scoreRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleBehaviorScore).setStyle(ButtonStyle.Secondary)
      .setLabel(`⚖️ Score: ${boolText(c.behaviorScoreEnabled, guildId)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleBlacklistWarn).setStyle(ButtonStyle.Secondary)
      .setLabel(`🚫 Blacklist: ${c.blacklistWarn ? 'Warn' : 'Silent'}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.cycleLogsLevel).setStyle(ButtonStyle.Secondary)
      .setLabel(`📋 Logs: ${c.logsEnabled ? c.logsLevel : 'OFF'}`)
  );
  const spamRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseSpamThreshold).setStyle(ButtonStyle.Secondary).setLabel('Spam -1'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseSpamThreshold).setStyle(ButtonStyle.Secondary).setLabel('Spam +1'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseSlowMode).setStyle(ButtonStyle.Secondary).setLabel('Slow -1s')
      .setDisabled(c.slowModeSeconds === 0),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseSlowMode).setStyle(ButtonStyle.Secondary).setLabel('Slow +1s')
      .setDisabled(c.slowModeSeconds >= 120)
  );
  const blacklistRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.addBlacklistWord).setStyle(ButtonStyle.Primary).setLabel('✏️ Gérer mots bannis'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.clearBlacklist).setStyle(ButtonStyle.Danger).setLabel('🗑️ Vider liste')
      .setDisabled(c.blacklistWords.length === 0)
  );
  return [scoreRow, spamRow, blacklistRow, buildNavRow(guildId, 7)];
}

function buildStep8Summary(guildId) {
  const mappings = getGradeMappings(guildId);
  const modules = getStep2Config(guildId);
  const members = getStep4Config(guildId);
  const vocal = getStep4VocalConfig(guildId);
  const games = listSetupGames(guildId);
  const mod = getStep7Config(guildId);

  return [
    `## ${t('setup.step8Title', {}, { guildId })} (8/${TOTAL_STEPS})`,
    t('setup.step8Instructions', {}, { guildId }),
    '',
    `**Grades mappés** : ${Object.keys(mappings).length}/5`,
    '',
    '**Modules**',
    `  💡 Suggestions: ${onOff(modules.suggestionsEnabled, guildId)} | 🖥️ Serveurs: ${onOff(modules.serverListEnabled, guildId)} | 🤖 Statut: ${onOff(modules.statusBotEnabled, guildId)}`,
    `  🔇 AFK: ${onOff(modules.afkEnabled, guildId)} | 🎮 Game Updates: ${onOff(modules.gameUpdatesEnabled, guildId)}`,
    '',
    '**Membres**',
    `  ⏱️ Délai: ${members.promotionDelayHours}h | 📝 Bio: ${boolText(members.bioRequired, guildId)} | 👥 Parrainage: ${boolText(members.sponsorshipRequired, guildId)}`,
    `  🚪 Expulsion: ${boolText(members.inviteExpulsionEnabled, guildId)} (${members.inviteExpulsionDays}j)`,
    '',
    '**Vocaux**',
    `  ${vocal.prefix} | Limite: ${vocal.memberLimit === 0 ? '∞' : vocal.memberLimit} | Délai supp: ${vocal.deleteDelayMinutes}min`,
    '',
    `**Jeux configurés** : ${games.length}`,
    '',
    '**Modération**',
    `  ⚖️ Score: ${boolText(mod.behaviorScoreEnabled, guildId)} | 🛡️ Spam max: ${mod.spamThreshold}/3s | 🚫 Blacklist: ${mod.blacklistWarn ? 'warn' : 'silent'}`,
    `  📋 Mots bannis: ${mod.blacklistWords.length}`,
    '',
    `> ⚠️ ${t('setup.step8ConfirmWarning', {}, { guildId })}`
  ].join('\n');
}

function buildStep8Components(guildId) {
  return [buildNavRow(guildId, TOTAL_STEPS)];
}

function buildStepPayload(guildId, guild, step) {
  switch (step) {
    case 1: return { content: buildStepOneContent(guildId, guild), components: buildStepOneComponents(guildId, guild) };
    case 2: return { content: buildStep2Content(guildId), components: buildStep2Components(guildId) };
    case 3: return { content: buildStep3ChannelsContent(guildId, guild), components: buildStep3ChannelsComponents(guildId, guild) };
    case 4: return { content: buildStep4Content(guildId), components: buildStep4Components(guildId) };
    case 5: return { content: buildStep5VocalContent(guildId), components: buildStep5VocalComponents(guildId) };
    case 6: return { content: buildStep6Content_Games(guildId), components: buildStep6Components_Games(guildId) };
    case 7: return { content: buildStep7Content(guildId), components: buildStep7Components(guildId) };
    default: return { content: buildStep8Summary(guildId), components: buildStep8Components(guildId) };
  }
}

async function renderStep(interaction, step) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  const payload = buildStepPayload(guildId, guild, step);
  try {
    await interaction.message.edit(payload);
    await interaction.deferUpdate().catch(() => {});
  } catch (err) {
    if (err.code === 10008 && interaction.channel?.send) {
      await interaction.channel.send(payload);
      await interaction.deferUpdate().catch(() => {});
    } else {
      throw err;
    }
  }
}

async function startWizardInChannel(interaction) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  setGuildSetting(guildId, 'setup', 'step', 1);
  setGradeCursor(guildId, 0);
  const payload = buildStepPayload(guildId, guild, 1);
  try {
    await interaction.message.edit(payload);
    await interaction.deferUpdate().catch(() => {});
  } catch (err) {
    if (err.code === 10008 && interaction.channel?.send) {
      await interaction.channel.send(payload);
      await interaction.deferUpdate().catch(() => {});
    } else {
      throw err;
    }
  }
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
    setGuildSetting(guildId, 'setup', 'roles_auto_created', true);
    setGuildSetting(guildId, 'setup', 'fresh_install', false);
    setGradeCursor(guildId, 0);
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
    await interaction.showModal(modal);
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

  if (interaction.customId.startsWith(`${CUSTOM_IDS.channelSelectPrefix}:`)) {
    const slotKey = interaction.customId.split(':').pop();
    const slot = CHANNEL_SLOTS.find((s) => s.key === slotKey);
    if (slot && interaction.values?.[0] && interaction.values[0] !== 'none') {
      setGuildSetting(guildId, slot.settingSection, slot.settingKey, interaction.values[0]);
    }
    const cursor = getChannelCursor(guildId);
    if (cursor < CHANNEL_SLOTS.length - 1) setChannelCursor(guildId, cursor + 1);
    await renderStep(interaction, 3); return true;
  }
  if (interaction.customId.startsWith(`${CUSTOM_IDS.channelSkip}:`)) {
    const action = interaction.customId.split(':').pop();
    const cursor = getChannelCursor(guildId);
    if (action === 'prev') { setChannelCursor(guildId, cursor - 1); await renderStep(interaction, 3); return true; }
    if (action === 'skip') { setChannelCursor(guildId, CHANNEL_SLOTS.length - 1); await renderStep(interaction, 3); return true; }
    if (action === 'next') {
      if (cursor >= CHANNEL_SLOTS.length - 1) { const nextStep = 4; setGuildSetting(guildId, 'setup', 'step', nextStep); await renderStep(interaction, nextStep); }
      else { setChannelCursor(guildId, cursor + 1); await renderStep(interaction, 3); }
      return true;
    }
  }

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

  if (interaction.customId === CUSTOM_IDS.cycleVocalPrefix) {
    const c = getStep4VocalConfig(guildId);
    c.prefix = cycleVocalPrefix(c.prefix);
    setGuildSetting(guildId, 'vocal', 'prefix', c.prefix);
    await renderStep(interaction, 5); return true;
  }
  if (interaction.customId === CUSTOM_IDS.editVocalSuffix) {
    await sendSetupMessage(interaction, `Suffixe actuel : \`${getStep4VocalConfig(guildId).suffix}\`\nPour le modifier, utilisez le panel de configuration vocale après l'installation.`);
    return true;
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
    c.deleteDelayMinutes = Math.max(1, c.deleteDelayMinutes - 1);
    setGuildSetting(guildId, 'vocal', 'delete_delay_minutes', c.deleteDelayMinutes);
    await renderStep(interaction, 5); return true;
  }
  if (interaction.customId === CUSTOM_IDS.increaseVocalDelay) {
    const c = getStep4VocalConfig(guildId);
    c.deleteDelayMinutes = Math.min(60, c.deleteDelayMinutes + 1);
    setGuildSetting(guildId, 'vocal', 'delete_delay_minutes', c.deleteDelayMinutes);
    await renderStep(interaction, 5); return true;
  }

  if (interaction.customId === CUSTOM_IDS.addGame) {
    addSetupGame(guildId);
    const games = listSetupGames(guildId);
    setStep5Cursor(guildId, games.length - 1);
    await renderStep(interaction, 6); return true;
  }
  if (interaction.customId === CUSTOM_IDS.removeLastGame) {
    removeLastSetupGame(guildId);
    const games = ensureAtLeastOneSetupGame(guildId);
    setStep5Cursor(guildId, Math.min(getStep5Cursor(guildId), games.length - 1));
    await renderStep(interaction, 6); return true;
  }
  if (interaction.customId === CUSTOM_IDS.previousGame) {
    setStep5Cursor(guildId, getStep5Cursor(guildId) - 1);
    await renderStep(interaction, 6); return true;
  }
  if (interaction.customId === CUSTOM_IDS.nextGameItem) {
    setStep5Cursor(guildId, getStep5Cursor(guildId) + 1);
    await renderStep(interaction, 6); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleGameGallery) {
    const games = ensureAtLeastOneSetupGame(guildId);
    const cursor = Math.min(getStep5Cursor(guildId), games.length - 1);
    updateSetupGame(guildId, games[cursor].game_id, { galerie_enabled: !Boolean(games[cursor].galerie_enabled) });
    await renderStep(interaction, 6); return true;
  }
  if (interaction.customId === CUSTOM_IDS.toggleGameChangelog) {
    const games = ensureAtLeastOneSetupGame(guildId);
    const cursor = Math.min(getStep5Cursor(guildId), games.length - 1);
    updateSetupGame(guildId, games[cursor].game_id, { changelog_enabled: !Boolean(games[cursor].changelog_enabled) });
    await renderStep(interaction, 6); return true;
  }
  if (interaction.customId === CUSTOM_IDS.cycleGameAppId) {
    const games = ensureAtLeastOneSetupGame(guildId);
    const cursor = Math.min(getStep5Cursor(guildId), games.length - 1);
    updateSetupGame(guildId, games[cursor].game_id, { steam_app_id: getSteamCycleValue(games[cursor].steam_app_id) });
    await renderStep(interaction, 6); return true;
  }

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
    await interaction.showModal(modal); return true;
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
  if (interaction.customId === CUSTOM_IDS.editWelcomeText) {
    const current = getStep4Config(guildId).welcomeText;
    const modal = new ModalBuilder().setCustomId(CUSTOM_IDS.welcomeModal).setTitle('Message de bienvenue')
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('text')
          .setLabel('Variables: {username}, {servername}, {delay}')
          .setStyle(TextInputStyle.Paragraph).setValue(current).setRequired(false).setMaxLength(500)
      ));
    await interaction.showModal(modal); return true;
  }
  if (interaction.isModalSubmit() && interaction.customId === CUSTOM_IDS.welcomeModal) {
    const text = interaction.fields.getTextInputValue('text').trim();
    setGuildSetting(guildId, 'members', 'welcome_text', text);
    await renderStep(interaction, 4); return true;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === CUSTOM_IDS.selectOwnerMember) {
    const memberId = interaction.values[0];
    if (memberId === 'none') { await interaction.deferUpdate().catch(() => {}); return true; }
    const mappings = getGradeMappings(guildId);
    const ownerRoleId = mappings[GRADE_NAMES.owner];
    if (ownerRoleId && interaction.guild) {
      try {
        const member = await interaction.guild.members.fetch(memberId);
        await member.roles.add(ownerRoleId, 'Guardian setup — attribution rôle Owner');
      } catch (err) {
        logger.error('Failed to assign owner role', err);
      }
    }
    await renderStep(interaction, 1);
    return true;
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
        if (validation.reason === 'owner_cardinality' && validation.details?.ownerCount === 0 && interaction.guild.members) {
          await interaction.deferUpdate().catch(() => {});
          const members = await interaction.guild.members.fetch();
          const nonBots = [...members.filter((m) => !m.user.bot).values()].slice(0, 25);
          const options = nonBots.map((m) => ({
            label: (m.nickname || m.user.displayName || m.user.username).slice(0, 25),
            value: m.id,
            description: `@${m.user.username}`.slice(0, 50)
          }));
          const ownerRoleId = validation.mappings[GRADE_NAMES.owner];
          const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(CUSTOM_IDS.selectOwnerMember)
              .setPlaceholder('Choisir le membre Owner (aura tous les droits)')
              .setMinValues(1).setMaxValues(1)
              .addOptions(options.length ? options : [{ label: 'Aucun membre', value: 'none' }])
          );
          const ownerRoleMention = ownerRoleId ? `<@&${ownerRoleId}>` : 'Owner';
          await interaction.channel.send({
            content: `⚠️ **Aucun membre n'a encore le rôle ${ownerRoleMention}.**\nChoisis le propriétaire du serveur — il aura tous les droits Guardian (gestion des grades, modération, configuration).`,
            components: [selectRow]
          });
          return true;
        }
        await sendSetupMessage(interaction, explainStepOneValidation(guildId, validation));
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
      await sendSetupMessage(interaction, t('setup.finalizeNotReady', {}, { guildId }));
      return true;
    }
    if (!interaction.guild) return true;

    await interaction.deferUpdate().catch(() => {});
    try {
      const { completeGuildSetup } = require('./setup');
      await completeGuildSetup(interaction.guild);
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

  return false;
}

module.exports = {
  CUSTOM_IDS,
  handleSetupInteraction,
  startWizardInChannel
};
