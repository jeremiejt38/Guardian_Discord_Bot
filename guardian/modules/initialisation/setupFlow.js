const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { GRADE_NAMES, CHANNELS, CATEGORIES } = require('../../config');
const { matchGameFromChannelName } = require('../games/steamGamesList');
const { analyzeNonGuardianRoles, buildSecurityCheckContent, hasUnresolvedIssues } = require('./roleSecurityCheck');
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const { replyEphemeral } = require('../utils/interactions');
const {
  ORDERED_GRADES,
  REQUIRED_GRADES,
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
  transferExistingRoles: 'setup:grade:transfer-existing',
  recreateRoles: 'setup:grade:recreate',
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
  toggleVocalSuffix: 'setup:vocal:suffix:toggle',
  decreaseVocalLimit: 'setup:vocal:limit:dec',
  increaseVocalLimit: 'setup:vocal:limit:inc',
  decreaseVocalDelay: 'setup:vocal:delay:dec',
  increaseVocalDelay: 'setup:vocal:delay:inc',
  cycleVocalPrefix: 'setup:vocal:prefix:cycle',
  addGame: 'setup:games:add',
  addGameModal: 'setup:games:add:modal',
  editGamePrefix: 'setup:games:edit',
  editGameModal: 'setup:games:edit:modal',
  deleteGamePrefix: 'setup:games:delete',
  confirmGamePrefix: 'setup:games:confirm',
  toggleGameGallery: 'setup:games:gallery:toggle',
  toggleGameChangelog: 'setup:games:changelog:toggle',
  toggleGameText: 'setup:games:text:toggle',
  addGameConfirmModal: 'setup:games:add:confirm:modal',
  toggleInviteGrade: 'setup:grade:invite:toggle',
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
  communityCheckContinue: 'setup:community:continue',
  communityCheckRetry: 'setup:community:retry',
  gameDetectAdopt: 'setup:gamedetect:adopt',
  gameDetectSkip: 'setup:gamedetect:skip',
  gameLinkNext: 'setup:gamelink:next',
  gameLinkSkip: 'setup:gamelink:skip',
  gameLinkChannelPrefix: 'setup:gamelink:channel',
  gameLinkTypeSelect: 'setup:gamelink:type',
  gamePagePrev: 'setup:games:page:prev',
  gamePageNext: 'setup:games:page:next',
  newOptionsNext: 'setup:newoptions:next',
  newOptionsSkip: 'setup:newoptions:skip',
  finalize: 'setup:finalize',
  confirmOwner: 'setup:grade:owner-confirm',
  securityContinue: 'setup:security:continue',
  securityRoleAction: 'setup:security:role',
  securityDeleteUnused: 'setup:security:unused:delete',
  securityKeepUnused: 'setup:security:unused:keep',
  securityDeleteAllUnused: 'setup:security:unused:delete-all',
  securityKeepAllUnused: 'setup:security:unused:keep-all',
  securityConfirmModal: 'setup:security:confirm-modal',
  clearAllGames: 'setup:games:clear-all'
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

function onOff(flag) {
  return flag ? '🟢 Actif' : '🔴 Inactif';
}

function onOffDot(flag) {
  return flag ? '🟢' : '🔴';
}

function buildNavRow(guildId, step) {
  const isLastStep = step >= TOTAL_STEPS;
  const buttons = [];
  if (step > 1) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.back)
        .setStyle(ButtonStyle.Secondary)
        .setLabel('◀ ' + t('setup.backStep', {}, { guildId }))
    );
  }
  if (!isLastStep) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.next)
        .setStyle(ButtonStyle.Primary)
        .setLabel(t('setup.nextStep', {}, { guildId }) + ' ▶')
    );
  } else {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.finalize)
        .setStyle(ButtonStyle.Success)
        .setLabel('🚀 ' + t('setup.finalizeButton', {}, { guildId }))
    );
  }
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
  const noRoles = !hasMapableRoles(guild);
  const { version } = require('../../package.json');
  const lines = [
    `## ${t('setup.step1Title', {}, { guildId })} (1/${TOTAL_STEPS}) — Guardian v${version}`
  ];

  const GRADE_DESCS = {
    invite:     '👤 Nouveau venu — accès limité, en attente de validation',
    membre:     '✅ Membre validé — accès complet aux channels communautaires',
    moderateur: '🛡️ Modérateur — peut sanctionner et gérer les membres',
    manager:    '⚙️ Manager — accès à la configuration Guardian',
    owner:      '👑 Owner — tous les droits, propriétaire du serveur Guardian'
  };
  if (autoCreated) {
    const renameMap = getGradeRenameMap(guildId);
    lines.push(t('setup.step1RenameDesc', {}, { guildId }));
    lines.push('');
    for (const grade of ORDERED_GRADES) {
      const roleId = mappings[grade];
      const roleName = renameMap[grade] || gradeLabel(grade);
      const roleExists = roleId && guild?.roles?.cache?.get(roleId);
      lines.push(`🏷️ **${gradeLabel(grade)}** → \`${roleName}\`` + (roleExists ? ` <@&${roleId}>` : ''));
      lines.push(`> ${GRADE_DESCS[grade] || ''}`);
    }
  } else if (noRoles) {
    lines.push(t('setup.step1NoRolesDesc', {}, { guildId }));
    lines.push('');
    for (const [grade, desc] of Object.entries(GRADE_DESCS)) {
      lines.push(`${desc}`);
    }
  } else {
    const cursor = getGradeCursor(guildId);
    const currentGrade = ORDERED_GRADES[cursor];
    const inviteEnabled = Boolean(getGuildSetting(guildId, 'setup', 'invite_grade_enabled', true));
    lines.push(t('setup.step1Instructions', {}, { guildId }));
    lines.push(`> Grade Invité : ${onOff(inviteEnabled)} — ${inviteEnabled ? 'les nouveaux membres reçoivent ce grade en arrivant.' : 'les nouveaux membres arrivent directement en Membre.'}`);
    lines.push(`> ${t('setup.step1CurrentGrade', { grade: gradeLabel(currentGrade) }, { guildId })}`);
    lines.push(`> ${GRADE_DESCS[currentGrade] || ''}`);
    lines.push('');
    const summary = ORDERED_GRADES.map((grade) => {
      const roleId = mappings[grade];
      const roleExists = roleId && guild?.roles?.cache?.get(roleId);
      const required = REQUIRED_GRADES.includes(grade);
      const marker = roleExists ? '✅' : (required ? '❌' : '⬜');
      const roleText = roleExists ? `<@&${roleId}>` : (required ? '*obligatoire*' : '*optionnel*');
      return `${marker} **${gradeLabel(grade)}** → ${roleText}`;
    }).join('\n');
    lines.push(summary);
  }

  return lines.join('\n');
}

function buildStepOneComponents(guildId, guild) {
  const noRoles = !hasMapableRoles(guild);
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
    const inviteEnabled = Boolean(getGuildSetting(guildId, 'setup', 'invite_grade_enabled', true));
    const autoRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.createRolesAuto)
        .setStyle(ButtonStyle.Primary)
        .setLabel(t('setup.step1CreateRolesAuto', {}, { guildId }))
    );
    const toggleInviteRowFresh = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.toggleInviteGrade)
        .setStyle(inviteEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setLabel(`Grade Invité : ${onOffDot(inviteEnabled)}`)
    );
    return [autoRow, toggleInviteRowFresh, buildNavRow(guildId, 1)];
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
      .setLabel('◀ Grade préc.')
      .setDisabled(cursor === 0),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.nextGrade)
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Grade suiv. ▶')
      .setDisabled(cursor >= ORDERED_GRADES.length - 1)
  );

  const inviteEnabled = Boolean(getGuildSetting(guildId, 'setup', 'invite_grade_enabled', true));
  const toggleInviteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.toggleInviteGrade)
      .setStyle(inviteEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setLabel(`Grade Invité : ${onOffDot(inviteEnabled)}`)
  );

  return [roleSelector, gradeNavigation, toggleInviteRow, buildNavRow(guildId, 1)];
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
  const dot = (v) => v ? '🟢 Actif' : '⚪ Inactif';
  return [
    `## ${t('setup.step2Title', {}, { guildId })} (2/${TOTAL_STEPS})`,
    t('setup.step2Instructions', {}, { guildId }),
    '',
    `💡 **Suggestions** — ${dot(c.suggestionsEnabled)}`,
    '> Les membres peuvent soumettre des idées et voter via un forum dédié.',
    '',
    `🖥️ **Liste de serveurs** — ${dot(c.serverListEnabled)}`,
    '> Affiche les serveurs de jeu approuvés par la communauté.',
    '',
    `🤖 **Statut du bot** — ${dot(c.statusBotEnabled)}`,
    '> Message automatique affichant l\'uptime et la version de Guardian.',
    '',
    `🔇 **Vocal AFK** — ${dot(c.afkEnabled)}`,
    '> Salon où Discord déplace automatiquement les membres inactifs.',
    '',
    `📢 **Game Updates** — ${dot(c.gameUpdatesEnabled)}`,
    '> Publie les changelogs Steam des jeux configurés dans un channel dédié.'
  ].join('\n');
}

function buildStep2Components(guildId) {
  const c = getStep2Config(guildId);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleSuggestions).setStyle(ButtonStyle.Secondary)
      .setLabel(`💡 Suggestions: ${onOffDot(c.suggestionsEnabled)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleServerList).setStyle(ButtonStyle.Secondary)
      .setLabel(`🖥️ Serveurs: ${onOffDot(c.serverListEnabled)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleStatusBot).setStyle(ButtonStyle.Secondary)
      .setLabel(`🤖 Statut: ${onOffDot(c.statusBotEnabled)}`)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleAfk).setStyle(ButtonStyle.Secondary)
      .setLabel(`🔇 AFK: ${onOffDot(c.afkEnabled)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleGameUpdates).setStyle(ButtonStyle.Secondary)
      .setLabel(`🎮 Game Updates: ${onOffDot(c.gameUpdatesEnabled)}`)
  );
  return [row, row2, buildNavRow(guildId, 2)];
}

const CHANNEL_SLOTS = Object.freeze([
  // ── Vocals (proposés en premier car souvent déjà là)
  { key: 'voiceGeneral', label: 'Vocal Général',   desc: 'Salon vocal principal — Guardian y crée des rooms temporaires.',                                    settingSection: 'channels', settingKey: 'voice_general_id',             emoji: '�', addedInVersion: '0.1.0' },
  { key: 'voiceAfk',    label: 'Vocal AFK',         desc: 'Salon vocal AFK — les membres inactifs y sont déplacés automatiquement.',                          settingSection: 'channels', settingKey: 'voice_afk_id',                  emoji: '🔇', addedInVersion: '0.1.0' },
  // ── Channels communautaires existants
  { key: 'general',     label: '#général',           desc: 'Channel de discussion principale de la communauté.',                                               settingSection: 'channels', settingKey: 'general_channel_id',            emoji: '�', addedInVersion: '0.1.0' },
  { key: 'rules',       label: '#règles',            desc: 'Channel où le règlement du serveur est affiché.',                                                  settingSection: 'channels', settingKey: 'rules_channel_id',              emoji: '📜', communityOnly: true , addedInVersion: '0.1.0' },
  { key: 'moderationLogs', label: '#logs-modération', desc: 'Channel modérateurs — logs Guardian. Correspond au "Moderator Only" Discord.',                    settingSection: 'channels', settingKey: 'moderation_logs_channel_id',    emoji: '�️', communityOnly: true , addedInVersion: '0.1.0' },
  { key: 'securityUpdates', label: '#maj-securite', desc: 'Channel mises à jour de sécurité Discord — visible manager et owner uniquement.',                   settingSection: 'channels', settingKey: 'security_updates_channel_id',   emoji: '🔒', communityOnly: true , addedInVersion: '0.1.0' },
  // ── Channels créés par Guardian si absents (en dernier)
  { key: 'announcements', label: '#annonces',       desc: 'Channel réservé aux annonces officielles de l\'équipe. Guardian le crée si absent.',               settingSection: 'channels', settingKey: 'announcements_channel_id',      emoji: '�', addedInVersion: '0.1.0' },
  { key: 'faq',         label: '#faq',               desc: 'Channel FAQ — Guardian le crée sous forme de forum si absent.',                                    settingSection: 'channels', settingKey: 'faq_channel_id',                emoji: '❓', addedInVersion: '0.1.0' },
  { key: 'welcome',     label: '#bienvenue',         desc: 'Channel où Guardian accueille les nouveaux membres. Guardian le crée si absent.',                  settingSection: 'channels', settingKey: 'welcome_channel_id',            emoji: '�', addedInVersion: '0.1.0' }
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

function isCommunityGuild(guild) {
  return guild?.features?.includes('COMMUNITY') ?? false;
}

function getActiveSlotsForInstall(_guildId, guild) {
  if (!guild || isCommunityGuild(guild)) return CHANNEL_SLOTS;
  return CHANNEL_SLOTS.filter((s) => !s.communityOnly);
}

function buildStep3ChannelsContent(guildId, guild) {
  const slots = getActiveSlotsForInstall(guildId, guild);
  const cursor = Math.min(getChannelCursor(guildId), slots.length - 1);
  const slot = slots[cursor];
  const currentId = getGuildSetting(guildId, slot.settingSection, slot.settingKey, null);
  const currentChannel = currentId && guild ? guild.channels.cache.get(currentId) : null;
  const statusLines = slots.map((s, i) => {
    const id = getGuildSetting(guildId, s.settingSection, s.settingKey, null);
    const ch = id && guild ? guild.channels.cache.get(id) : null;
    const marker = i === cursor ? '▶' : (ch ? '✅' : '—');
    return `${marker} ${s.emoji} **${s.label}** ${ch ? `→ #${ch.name}` : '*à configurer*'}`;
  }).join('\n');

  const lines = [
    `## ${t('setup.step3Title', {}, { guildId })} (3/${TOTAL_STEPS})`,
    t('setup.step3Instructions', {}, { guildId }),
  ];
  if (isFreshInstall(guildId)) {
    lines.push('> Installation fraîche — seuls les channels essentiels sont à configurer.');
  }
  lines.push('', statusLines, '',
    `> Configuration en cours : **${slot.emoji} ${slot.label}**`,
    slot.desc ? `> ${slot.desc}` : '',
    currentChannel ? `> ✅ Actuellement lié à : #${currentChannel.name}` : '> Non configuré — choisir ci-dessous ou laisser Guardian le créer'
  );
  return lines.join('\n');
}

function buildStep3ChannelsComponents(guildId, guild) {
  const slots = getActiveSlotsForInstall(guildId, guild);
  const cursor = Math.min(getChannelCursor(guildId), slots.length - 1);
  const slot = slots[cursor];
  const options = buildChannelOptions(guild, slot);
  const hasNone = options.length === 1 && options[0].value === 'none';

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`${CUSTOM_IDS.channelSelectPrefix}:${slot.key}`)
    .setPlaceholder(`Lier un ${slot.label} existant`)
    .setDisabled(hasNone)
    .addOptions(options);

  const isRequired = slot.key === 'general' || slot.key === 'voiceGeneral';
  const selectRow = new ActionRowBuilder().addComponents(selectMenu);
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${CUSTOM_IDS.channelSkip}:prev`).setStyle(ButtonStyle.Secondary)
      .setLabel('◀ Préc.').setDisabled(cursor === 0),
    new ButtonBuilder().setCustomId(`${CUSTOM_IDS.channelSkip}:next`).setStyle(ButtonStyle.Primary)
      .setLabel('🤖 Laisser Guardian créer').setDisabled(false),
    new ButtonBuilder().setCustomId(`${CUSTOM_IDS.channelSkip}:ignore`).setStyle(ButtonStyle.Secondary)
      .setLabel('⏭️ Ignorer ce channel').setDisabled(isRequired)
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
    `⏱️ **Délai de promotion** : ${c.promotionDelayHours}h`,
    '> Temps minimum qu’un invité doit passer sur le serveur avant de pouvoir devenir Membre.',
    `📝 **Bio obligatoire** : ${onOff(c.bioRequired)}`,
    '> Si actif, les invités doivent renseigner leur profil avant d’être promus.',
    `👥 **Parrainage** : ${onOff(c.sponsorshipRequired)}`,
    '> Si actif, un Membre existant doit parrainer l’invité pour qu’il soit promu.',
    `🔍 **Grade réviseur** : ${gradeLabel(c.reviewerGrade)}`,
    '> Grade minimum requis pour valider ou refuser une demande de promotion.',
    `🚪 **Expulsion des invités** : ${onOff(c.inviteExpulsionEnabled)} (après ${c.inviteExpulsionDays}j)`,
    '> Guardian expulse automatiquement les invités qui ne sont pas promus après le délai.',
    `💬 **Message de bienvenue** : ${welcomePreview}`,
    '> Message envoyé en privé à chaque nouveau membre qui rejoint le serveur.'
  ].join('\n');
}

function buildStep4Components(guildId) {
  const c = getStep4Config(guildId);
  const toggles = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleBioRequired).setStyle(ButtonStyle.Secondary)
      .setLabel(`📝 Bio: ${onOffDot(c.bioRequired)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleSponsorshipRequired).setStyle(ButtonStyle.Secondary)
      .setLabel(`👥 Parrainage: ${onOffDot(c.sponsorshipRequired)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.cyclePromotionReviewerGrade).setStyle(ButtonStyle.Secondary)
      .setLabel(`🔍 Réviseur: ${gradeLabel(c.reviewerGrade)}`)
  );
  const delay = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreasePromotionDelay).setStyle(ButtonStyle.Secondary).setLabel('⏱️ -12h'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increasePromotionDelay).setStyle(ButtonStyle.Secondary).setLabel('⏱️ +12h')
  );
  const expulsion = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleInviteExpulsion).setStyle(ButtonStyle.Secondary)
      .setLabel(`🚪 Expulsion: ${onOffDot(c.inviteExpulsionEnabled)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseInviteExpulsionDays).setStyle(ButtonStyle.Secondary).setLabel('📅 -1j'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseInviteExpulsionDays).setStyle(ButtonStyle.Secondary).setLabel('📅 +1j')
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

const VOCAL_PREFIX_CYCLE = ['', '🎮', '🎯', '🔊', '⚔️', '🏆', '🎲'];

function cycleVocalPrefix(current) {
  const idx = VOCAL_PREFIX_CYCLE.indexOf(current);
  return VOCAL_PREFIX_CYCLE[(idx < 0 ? 1 : idx + 1) % VOCAL_PREFIX_CYCLE.length];
}

function formatDelay(minutes) {
  const totalSec = Math.round(minutes * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}min`;
  return `${m}min ${s}s`;
}

function buildStep5VocalContent(guildId) {
  const c = getStep4VocalConfig(guildId);
  const limitDisplay = c.memberLimit === 0 ? '\u221e illimité' : `${c.memberLimit} membre(s) max`;
  const prefixDisplay = c.prefix === '' ? '*aucun*' : c.prefix;
  const suffixEnabled = Boolean(getGuildSetting(guildId, 'vocal', 'suffix_enabled', true));
  const exampleName = `${c.prefix ? c.prefix + ' ' : ''}Partie${suffixEnabled ? ' — Partie' : ''}`;
  return [
    `## ${t('setup.step5Title', {}, { guildId })} (5/${TOTAL_STEPS})`,
    t('setup.step5Instructions', {}, { guildId }),
    '',
    `🏷️ **Préfixe** : ${prefixDisplay}`,
    '> Emoji ou texte au début du nom — identifie visuellement les rooms Guardian.',
    '',
    `� **Suffixe** : ${onOffDot(suffixEnabled)}`,
    `> Texte « — Partie » ajouté à la fin du nom (ex : \`${exampleName}\`).`,
    '',
    `👥 **Limite de membres** : ${limitDisplay}`,
    '> Capacité max par room. Laisse à 0 pour illimité.',
    '',
    `⏱️ **Délai de suppression** : ${formatDelay(c.deleteDelayMinutes)}`,
    '> Délai avant qu\'une room vocale vide soit supprimée automatiquement.'
  ].join('\n');
}

function buildStep5VocalComponents(guildId) {
  const c = getStep4VocalConfig(guildId);
  const limitDisplay = c.memberLimit === 0 ? '∞' : String(c.memberLimit);
  const prefixDisplay = c.prefix === '' ? 'Aucun' : c.prefix;
  const suffixEnabled = Boolean(getGuildSetting(guildId, 'vocal', 'suffix_enabled', true));
  const prefixRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.cycleVocalPrefix).setStyle(ButtonStyle.Secondary)
      .setLabel(`🏷️ Préfixe: ${prefixDisplay} →`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleVocalSuffix)
      .setStyle(suffixEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setLabel(`🏷️ Suffixe: ${onOffDot(suffixEnabled)}`)
  );
  const limitRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseVocalLimit).setStyle(ButtonStyle.Secondary).setLabel('👤 -1')
      .setDisabled(c.memberLimit === 0),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseVocalLimit).setStyle(ButtonStyle.Secondary).setLabel(`👤 +1 (${limitDisplay})`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseVocalDelay).setStyle(ButtonStyle.Secondary).setLabel('⏱️ -30s')
      .setDisabled(c.deleteDelayMinutes <= 0.5),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseVocalDelay).setStyle(ButtonStyle.Secondary).setLabel(`⏱️ +30s (${formatDelay(c.deleteDelayMinutes)})`)
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

const GAMES_PAGE_SIZE = 3;

function getGamesPage(guildId) {
  const p = getGuildSetting(guildId, 'setup', 'games_page', 0);
  return Number.isInteger(p) ? Math.max(0, p) : 0;
}

function setGamesPage(guildId, page) {
  const games = listSetupGames(guildId);
  const maxPage = Math.max(0, Math.ceil(games.length / GAMES_PAGE_SIZE) - 1);
  const safe = Math.min(Math.max(0, page), maxPage);
  setGuildSetting(guildId, 'setup', 'games_page', safe);
  return safe;
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
  const games = listSetupGames(guildId);
  const lines = [
    `## ${t('setup.step6Title', {}, { guildId })} (6/${TOTAL_STEPS})`,
    '',
    '🎮 **Pourquoi une liste de jeux ?**',
    '> Guardian utilise cette liste pour créer automatiquement les channels liés à chaque jeu :',
    '> 🔊 **Salons vocaux** dédiés — Guardian sait quels salons vocaux créer et les nomme automatiquement.',
    '> 💬 **Channel texte** dédié au jeu — discussion, annonces et organisation.',
    '> 📢 **Channel updates** — mises à jour du jeu publiées automatiquement (si Steam ID fourni).',
    '> 🖼️ **Channel galerie** — screenshots partagés par les membres.',
    '',
    '🔗 **Steam ID** : identifiant numérique unique de chaque jeu sur Steam.',
    '> Exemples : `730` = CS2, `570` = Dota 2, `440` = TF2.',
    '> Guardian le détecte automatiquement depuis le nom du jeu — tu n\'as rien à chercher.',
    '> Les jeux non disponibles sur Steam peuvent être ajoutés sans Steam ID.',
    '',
  ];
  if (games.length === 0) {
    lines.push('ℹ️ **Aucun jeu configuré.** La liste vide ne bloque pas le fonctionnement du bot.');
    lines.push('> Tu peux ajouter des jeux maintenant ou plus tard via `/config games`.');
  } else {
    const page = getGamesPage(guildId);
    const totalPages = Math.ceil(games.length / GAMES_PAGE_SIZE);
    const pageGames = games.slice(page * GAMES_PAGE_SIZE, (page + 1) * GAMES_PAGE_SIZE);
    lines.push(`**${games.length} jeu(x) configuré(s)** — page ${page + 1}/${totalPages}`);
    for (const game of pageGames) {
      lines.push(
        `\n🎮 **${game.name}**`,
        `> Steam ID : \`${game.steam_app_id || 'non défini'}\``
      );
    }
  }
  return lines.join('\n');
}

function buildStep6Components_Games(guildId) {
  const games = listSetupGames(guildId);
  const page = getGamesPage(guildId);
  const totalPages = Math.max(1, Math.ceil(games.length / GAMES_PAGE_SIZE));
  const pageGames = games.slice(page * GAMES_PAGE_SIZE, (page + 1) * GAMES_PAGE_SIZE);
  const rows = [];

  const addRowButtons = [
    new ButtonBuilder().setCustomId(CUSTOM_IDS.addGame).setStyle(ButtonStyle.Primary).setLabel('➕ Ajouter un jeu'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.gamePagePrev).setStyle(ButtonStyle.Secondary)
      .setLabel('◀').setDisabled(page === 0),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.gamePageNext).setStyle(ButtonStyle.Secondary)
      .setLabel(`▶ (${page + 1}/${totalPages})`).setDisabled(page >= totalPages - 1)
  ];
  if (games.length > 0) {
    addRowButtons.push(new ButtonBuilder().setCustomId(CUSTOM_IDS.clearAllGames).setStyle(ButtonStyle.Danger).setLabel('🧹 Tout effacer'));
  }
  const addRow = new ActionRowBuilder().addComponents(addRowButtons);
  rows.push(addRow);

  for (const game of pageGames) {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.editGamePrefix}:${game.game_id}`)
        .setStyle(ButtonStyle.Secondary)
        .setLabel(`✏️ ${game.name.slice(0, 18)}`),
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.toggleGameGallery}:${game.game_id}`)
        .setStyle(game.galerie_enabled ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setLabel(`🖼️ ${onOffDot(Boolean(game.galerie_enabled))}`),
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.toggleGameChangelog}:${game.game_id}`)
        .setStyle(game.changelog_enabled ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setLabel(`📢 ${onOffDot(Boolean(game.changelog_enabled))}`),
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.toggleGameText}:${game.game_id}`)
        .setStyle(game.text_channel_enabled ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setLabel(`💬 ${onOffDot(Boolean(game.text_channel_enabled))}`),
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.deleteGamePrefix}:${game.game_id}`)
        .setStyle(ButtonStyle.Danger)
        .setLabel('🗑️')
    ));
    if (rows.length >= 4) break;
  }
  rows.push(buildNavRow(guildId, 6));
  return rows;
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
    ? c.blacklistWords.slice(0, 8).map((w) => `\`${w}\``).join(', ') + (c.blacklistWords.length > 8 ? ` *(+${c.blacklistWords.length - 8} autres)*` : '')
    : '*aucune*';
  const slowDisplay = c.slowModeSeconds === 0 ? '*désactivé*' : `${c.slowModeSeconds}s entre messages`;
  const logsDisplay = c.logsEnabled ? `🟢 ${c.logsLevel}` : '⚪ désactivé';
  return [
    `## ${t('setup.step7Title', {}, { guildId })} (7/${TOTAL_STEPS})`,
    t('setup.step7Instructions', {}, { guildId }),
    '',
    `⚖️ **Score comportemental** — ${onOff(c.behaviorScoreEnabled)}`,
    '> Note chaque membre selon ses messages, sanctions et ancienneté.',
    '',
    `🛡️ **Anti-spam** — max ${c.spamThreshold} msg / 3s`,
    '> Messages supprimés automatiquement si le seuil est dépassé.',
    '',
    `🐌 **Slow mode** — ${slowDisplay}`,
    '> Délai imposé entre deux messages dans tous les salons.',
    '',
    `🚫 **Blacklist** — ${c.blacklistWarn ? '⚠️ warn public' : '🤫 suppression silencieuse'} — ${c.blacklistWords.length} mot(s)`,
    `> ${wordList !== '*aucune*' ? wordList : 'Aucun mot banni configuré.'}`,
    '',
    `📋 **Logs Guardian** — ${logsDisplay}`,
    '> Historique des actions du bot dans un salon dédié (sanctions, promotions, erreurs).'
  ].join('\n');
}

function buildStep7Components(guildId) {
  const c = getStep7Config(guildId);
  const scoreRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleBehaviorScore).setStyle(ButtonStyle.Secondary)
      .setLabel(`⚖️ Score: ${onOffDot(c.behaviorScoreEnabled)}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.toggleBlacklistWarn).setStyle(ButtonStyle.Secondary)
      .setLabel(`🚫 Blacklist: ${c.blacklistWarn ? 'Warn' : 'Silent'}`),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.cycleLogsLevel).setStyle(ButtonStyle.Secondary)
      .setLabel(`📋 Logs: ${c.logsEnabled ? c.logsLevel : 'OFF'}`)
  );
  const spamRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseSpamThreshold).setStyle(ButtonStyle.Secondary).setLabel('🛡️ Spam -1'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseSpamThreshold).setStyle(ButtonStyle.Secondary).setLabel('🛡️ Spam +1'),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.decreaseSlowMode).setStyle(ButtonStyle.Secondary).setLabel('🐌 Slow -1s')
      .setDisabled(c.slowModeSeconds === 0),
    new ButtonBuilder().setCustomId(CUSTOM_IDS.increaseSlowMode).setStyle(ButtonStyle.Secondary).setLabel('🐌 Slow +1s')
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
  const modLogsEnabled = Boolean(getGuildSetting(guildId, 'modules', 'mod_logs_enabled', false));
  const modLogsChannelId = getGuildSetting(guildId, 'channels', 'moderation_logs_channel_id', null);
  const suffixEnabled = Boolean(getGuildSetting(guildId, 'vocal', 'suffix_enabled', true));

  return [
    `## ${t('setup.step8Title', {}, { guildId })} (8/${TOTAL_STEPS})`,
    t('setup.step8Instructions', {}, { guildId }),
    '',
    `**Grades mappés** : ${Object.keys(mappings).length}/5`,
    '',
    '**Modules**',
    `  💡 Suggestions: ${onOffDot(modules.suggestionsEnabled)} | 🖥️ Serveurs: ${onOffDot(modules.serverListEnabled)} | 🤖 Statut: ${onOffDot(modules.statusBotEnabled)}`,
    `  🔇 AFK: ${onOffDot(modules.afkEnabled)} | 🎮 Game Updates: ${onOffDot(modules.gameUpdatesEnabled)}`,
    '',
    '**Membres**',
    `  ⏱️ Délai: ${members.promotionDelayHours}h | 📝 Bio: ${onOffDot(members.bioRequired)} | 👥 Parrainage: ${onOffDot(members.sponsorshipRequired)}`,
    `  🚪 Expulsion: ${onOffDot(members.inviteExpulsionEnabled)} (${members.inviteExpulsionDays}j)`,
    '',
    '**Vocaux**',
    `  Préfixe: ${vocal.prefix || '*aucun*'} | Suffixe: ${onOffDot(suffixEnabled)} | Limite: ${vocal.memberLimit === 0 ? '∞' : vocal.memberLimit} | Délai supp: ${vocal.deleteDelayMinutes}min`,
    '',
    `**Jeux configurés** : ${games.length}`,
    '',
    '**Modération**',
    `  ⚖️ Score: ${onOffDot(mod.behaviorScoreEnabled)} | 🛡️ Spam max: ${mod.spamThreshold}/3s | 🚫 Blacklist: ${mod.blacklistWarn ? 'warn' : 'silent'}`,
    `  📋 Mots bannis: ${mod.blacklistWords.length}`,
    `  🛡️ Logs modération: ${onOffDot(modLogsEnabled)}${modLogsChannelId ? ` → <#${modLogsChannelId}>` : ''}`,
    '',
    `> ⚠️ ${t('setup.step8ConfirmWarning', {}, { guildId })}`
  ].join('\n');
}

function buildStep8Components(guildId) {
  return [buildNavRow(guildId, TOTAL_STEPS)];
}

async function createRolesAutoHelper(interaction, guild, guildId) {
  const roleColors = {
    [GRADE_NAMES.invite]: 0x95a5a6,
    [GRADE_NAMES.membre]: 0x3498db,
    [GRADE_NAMES.moderateur]: 0x2ecc71,
    [GRADE_NAMES.manager]: 0xe67e22,
    [GRADE_NAMES.owner]: 0xe74c3c
  };
  for (const grade of ORDERED_GRADES) {
    try {
      const existingMappedId = getGradeMappings(guildId)[grade];
      const alreadyExists = existingMappedId && guild.roles.cache.has(existingMappedId);
      if (alreadyExists) continue;
      const role = await guild.roles.create({
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
  await renderStep(interaction, 1);
}

function detectDuplicateGradeRoles(guild) {
  if (!guild?.roles?.cache) return [];
  const dupes = [];
  for (const grade of ORDERED_GRADES) {
    const label = gradeLabel(grade).toLowerCase();
    const matches = [...guild.roles.cache.values()].filter(
      (r) => r.name.toLowerCase() === label && !r.managed && r.id !== guild.roles.everyone?.id
    );
    if (matches.length > 1) dupes.push({ grade, roles: matches });
  }
  return dupes;
}

function getIgnoredChannelSlots(guildId) {
  const raw = getGuildSetting(guildId, 'setup', 'ignored_channel_slots', null);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function addIgnoredChannelSlot(guildId, slotKey) {
  const ignored = getIgnoredChannelSlots(guildId);
  if (!ignored.includes(slotKey)) ignored.push(slotKey);
  setGuildSetting(guildId, 'setup', 'ignored_channel_slots', JSON.stringify(ignored));
}

function autoPositionChannelCursor(guildId, guild) {
  const slots = getActiveSlotsForInstall(guildId, guild);
  const ignored = getIgnoredChannelSlots(guildId);
  const firstUnconfigured = slots.findIndex(
    (s) => !ignored.includes(s.key) && !getGuildSetting(guildId, s.settingSection, s.settingKey, null)
  );
  if (firstUnconfigured !== -1) setChannelCursor(guildId, firstUnconfigured);
}

function buildCommunityCheckContent(guildId, guild) {
  const memberCount = guild?.memberCount ?? 0;
  const hasRules = guild?.rulesChannelId != null;
  const hasVerification = guild ? guild.verificationLevel >= 1 : false;
  const hasModChannel = guild?.publicUpdatesChannelId != null;

  const req = (ok, label) => `${ok ? '✅' : '❌'} ${label}`;

  return [
    `## ⚠️ Serveur classique détecté (${TOTAL_STEPS > 0 ? `${TOTAL_STEPS}/` : ''}${TOTAL_STEPS})`,
    '',
    '> Ton serveur n\'est pas encore en mode **Communautaire**.',
    '> Certains salons Guardian sont exclusifs à ce mode et seront ignorés si tu continues sans l\'activer.',
    '',
    '### 🔒 Salons exclusifs au mode Communautaire',
    '> 📜 **#règles** — salon officiel du règlement (requis par Discord)',
    '> 🛡️ **#logs-modération** — corresponds au salon « Moderator Only » de Discord',
    '> 🔒 **#maj-securite** — reçoit les mises à jour de sécurité Discord',
    '',
    '### ✨ Ce que le mode Communautaire apporte',
    '> 📣 Salons **Annonces** (abonnements croisés entre serveurs)',
    '> 🎪 Accès aux **Événements** programmés (agenda communautaire)',
    '> 📊 **Insights serveur** — statistiques d\'audience et de croissance',
    '> 🎭 **Salons Stage** (conférences audio publiques)',
    '> 🏷️ **Répertoire Discord** — ton serveur devient découvrable',
    '',
    '### ✅ Prérequis pour activer la Communauté',
    req(memberCount >= 0, 'Serveur créé (toujours vrai)'),
    req(hasVerification, 'Niveau de vérification ≥ Faible (e-mail requis)'),
    req(hasRules, 'Salon « Règles » désigné'),
    req(hasModChannel, 'Salon « Mises à jour de la communauté » désigné'),
    '',
    '### ⚙️ Comment activer la Communauté',
    '> 1. Ouvre les **Paramètres du serveur** (roue dentée à côté du nom)',
    '> 2. Menu **Activer la communauté** → clique sur **Commencer**',
    '> 3. Suis les étapes Discord (vérification, règles, sécurité)',
    '> 4. Reviens ici et clique **🔄 Vérifier à nouveau**',
    '',
    '*Tu peux aussi continuer sans activer — les salons communautaires seront simplement ignorés.*'
  ].join('\n');
}

function buildCommunityCheckComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.communityCheckRetry)
        .setStyle(ButtonStyle.Primary)
        .setLabel('🔄 Vérifier à nouveau'),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.communityCheckContinue)
        .setStyle(ButtonStyle.Secondary)
        .setLabel('Continuer sans activer')
    )
  ];
}

// ── Détection jeux existants ──────────────────────────────────────────────────

function normalizeGameSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const GUARDIAN_RESERVED_CHANNEL_NAMES = new Set(Object.values(CHANNELS));
const GUARDIAN_RESERVED_CATEGORY_NAMES = new Set(Object.values(CATEGORIES));
const GUARDIAN_RESERVED_BASE_NAMES = new Set(Object.values(CHANNELS).map((n) => n.replace(/-changelogs?|-updates?|-galerie|-texte$/, '').toLowerCase()));

function detectExistingGameChannels(guild) {
  const guardianCategoryIds = new Set(
    [...guild.channels.cache.values()]
      .filter((c) => c.type === 4 && GUARDIAN_RESERVED_CATEGORY_NAMES.has(c.name))
      .map((c) => c.id)
  );

  const allText = [...guild.channels.cache.values()].filter((c) => {
    if (c.type !== 0 && c.type !== 5 && c.type !== 15) return false;
    if (GUARDIAN_RESERVED_CHANNEL_NAMES.has(c.name)) return false;
    if (c.parentId && guardianCategoryIds.has(c.parentId)) return false;
    return true;
  });

  const gameMap = new Map();
  for (const ch of allText) {
    const n = ch.name;
    const isGalerie = n.endsWith('-galerie');
    const isChangelog = n.endsWith('-changelogs') || n.endsWith('-updates');
    const isForum = ch.type === 15;
    let baseName = n;
    let type = 'text';
    if (isGalerie) { baseName = n.slice(0, -8); type = 'galerie'; }
    else if (isChangelog) { baseName = n.endsWith('-changelogs') ? n.slice(0, -11) : n.slice(0, -8); type = 'changelog'; }
    if (isForum) type = 'forum';
    if (!gameMap.has(baseName)) gameMap.set(baseName, { baseName, channels: [] });
    gameMap.get(baseName).channels.push({ id: ch.id, name: ch.name, type });
  }
  return [...gameMap.values()]
    .filter((g) => g.channels.length >= 1 && g.baseName.length >= 3)
    .filter((g) => !GUARDIAN_RESERVED_BASE_NAMES.has(g.baseName.toLowerCase()))
    .map((g) => {
      const steamMatch = matchGameFromChannelName(g.baseName);
      return { ...g, steamName: steamMatch?.name ?? null, steamAppId: steamMatch?.appid ?? null };
    })
    .filter((g) => g.steamName !== null && g.steamAppId != null);
}

function getDetectedGames(guildId) {
  const raw = getGuildSetting(guildId, 'setup', 'detected_games', null);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function setDetectedGames(guildId, games) {
  setGuildSetting(guildId, 'setup', 'detected_games', JSON.stringify(games));
}

function getGameLinkCursor(guildId) {
  return Math.max(0, Number(getGuildSetting(guildId, 'setup', 'game_link_cursor', 0)) || 0);
}

function setGameLinkCursor(guildId, v) {
  setGuildSetting(guildId, 'setup', 'game_link_cursor', Math.max(0, v));
}

function buildGameDetectContent(guildId, guild) {
  const games = detectExistingGameChannels(guild);
  const lines = [
    `## 🎮 Jeux détectés (3/${TOTAL_STEPS})`,
    '',
  ];
  if (games.length === 0) {
    lines.push(
      'Aucun channel ressemblant à un jeu n\'a été détecté sur ce serveur.',
      '> Guardian va créer automatiquement la structure pour les jeux que tu ajouteras à l\'étape suivante.'
    );
  } else {
    lines.push(
      `**${games.length} jeu(x) potentiel(s) détecté(s)** dans les channels existants :`,
      ''
    );
    for (const g of games.slice(0, 10)) {
      const types = g.channels.map((c) => {
        if (c.type === 'galerie') return '🖼️';
        if (c.type === 'changelog') return '📢';
        if (c.type === 'forum') return '🗂️';
        return '💬';
      }).join(' ');
      const steamLabel = g.steamName ? ` → **${g.steamName}**${g.steamAppId ? ` \`(#${g.steamAppId})\`` : ''}` : '';
      lines.push(`> 🎮 \`${g.baseName}\`${steamLabel} — ${types} (${g.channels.length} salon(s))`);
    }
    lines.push(
      '',
      '**Veux-tu que Guardian récupère ces channels ?**',
      '> ✅ **Oui** — Guardian va te demander de lier chaque channel à un jeu.',
      '> ⏭️ **Non / Ignorer** — Guardian ignore ces channels et en crée de nouveaux.'
    );
  }
  return lines.join('\n');
}

function buildGameDetectComponents(guild) {
  const games = detectExistingGameChannels(guild);
  if (games.length === 0) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.gameDetectSkip).setStyle(ButtonStyle.Primary).setLabel('➡️ Continuer')
      )
    ];
  }
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.gameDetectAdopt).setStyle(ButtonStyle.Success).setLabel('✅ Récupérer ces channels'),
      new ButtonBuilder().setCustomId(CUSTOM_IDS.gameDetectSkip).setStyle(ButtonStyle.Secondary).setLabel('⏭️ Ignorer')
    )
  ];
}

const GAMELINK_TYPE_LABELS = Object.freeze({
  text:      { icon: '💬', label: 'Chat texte' },
  changelog: { icon: '📢', label: 'Annonces/Updates' },
  forum:     { icon: '🗂️', label: 'Forum' }
});
const GAMELINK_LINKABLE_TYPES = ['text', 'changelog', 'forum'];

function getGameLinkActiveType(guildId) {
  return getGuildSetting(guildId, 'setup', 'gamelink_active_type', null);
}
function setGameLinkActiveType(guildId, type) {
  setGuildSetting(guildId, 'setup', 'gamelink_active_type', type);
}

function buildGameLinkContent(guildId) {
  const games = getDetectedGames(guildId);
  const cursor = getGameLinkCursor(guildId);
  const game = games[cursor];
  if (!game) return '## Configuration des jeux\n\nAucun jeu à configurer.';

  const total = games.length;
  const activeType = getGameLinkActiveType(guildId);
  const displayName = game.steamName || game.baseName;
  const lines = [
    `## 🎮 Lier les channels — **${displayName}** (${cursor + 1}/${total})`,
    '',
    `Associe tes channels existants à **${displayName}** :`,
    '> Clique sur un type puis sélectionne le channel correspondant.',
    '> Tu peux ignorer les types que tu n\'as pas.',
    ''
  ];

  for (const type of GAMELINK_LINKABLE_TYPES) {
    const ch = game.channels.find((c) => c.type === type);
    const { icon, label } = GAMELINK_TYPE_LABELS[type];
    const linked = ch?.linkedId ? `✅ \`#${ch.linkedName}\`` : '❌ *non lié*';
    const active = activeType === type ? ' ◀ en cours' : '';
    lines.push(`> ${icon} **${label}** : ${linked}${active}`);
  }

  return lines.join('\n');
}

function buildGameLinkComponents(guildId, guild) {
  const games = getDetectedGames(guildId);
  const cursor = getGameLinkCursor(guildId);
  const game = games[cursor];
  if (!game) return [buildNavRow(guildId, 3)];

  const activeType = getGameLinkActiveType(guildId);
  const rows = [];

  const typeButtons = GAMELINK_LINKABLE_TYPES.map((type) => {
    const { icon, label } = GAMELINK_TYPE_LABELS[type];
    const ch = game.channels.find((c) => c.type === type);
    const linked = ch?.linkedId;
    const isActive = activeType === type;
    return new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.gameLinkTypeSelect}:${cursor}:${type}`)
      .setLabel(`${icon} ${label}${linked ? ' ✅' : ''}`)
      .setStyle(isActive ? ButtonStyle.Primary : (linked ? ButtonStyle.Success : ButtonStyle.Secondary));
  });
  rows.push(new ActionRowBuilder().addComponents(...typeButtons));

  if (activeType) {
    const allowedDiscordTypes = activeType === 'forum' ? [15] : [0, 5];
    const slug = normalizeGameSlug(game.baseName);
    const TYPE_SUFFIXES = { text: ['texte', 'chat', 'discussion', 'general'], changelog: ['changelogs', 'updates', 'annonces', 'news'], forum: ['forum', 'discussion'] };
    const suffixes = TYPE_SUFFIXES[activeType] || [];
    const allCompatible = [...guild.channels.cache.values()].filter((c) => allowedDiscordTypes.includes(c.type));
    const scored = allCompatible.map((c) => {
      const n = c.name.toLowerCase();
      let score = 0;
      if (n === slug) score = 100;
      else if (n.startsWith(slug)) score = 90;
      else if (n.includes(slug)) score = 70;
      else if (slug.split('-').some((part) => part.length >= 3 && n.includes(part))) score = 40;
      if (suffixes.some((s) => n.endsWith(s) || n.includes(`-${s}`))) score += 15;
      return { c, score };
    });
    const candidates = scored
      .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name))
      .slice(0, 25)
      .map(({ c }) => ({ label: c.name.slice(0, 25), value: c.id, description: `#${c.name}`.slice(0, 50) }));
    if (candidates.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${CUSTOM_IDS.gameLinkChannelPrefix}:${cursor}:${activeType}`)
          .setPlaceholder(`${GAMELINK_TYPE_LABELS[activeType].icon} Choisir le channel ${GAMELINK_TYPE_LABELS[activeType].label}`)
          .addOptions(candidates)
      ));
    }
  }

  const navButtons = [
    new ButtonBuilder().setCustomId(CUSTOM_IDS.gameLinkSkip).setStyle(ButtonStyle.Secondary).setLabel('⏭️ Passer ce jeu')
  ];
  if (cursor < games.length - 1) {
    navButtons.push(new ButtonBuilder().setCustomId(CUSTOM_IDS.gameLinkNext).setStyle(ButtonStyle.Primary).setLabel('➡️ Jeu suivant'));
  } else {
    navButtons.push(new ButtonBuilder().setCustomId(CUSTOM_IDS.gameLinkNext).setStyle(ButtonStyle.Primary).setLabel('✅ Terminer'));
  }
  rows.push(new ActionRowBuilder().addComponents(...navButtons));
  return rows;
}

function buildStepPayload(guildId, guild, step) {
  function pad(content) { return content + '\n\u200b'; }
  switch (step) {
    case 1: return { content: pad(buildStepOneContent(guildId, guild)), components: buildStepOneComponents(guildId, guild) };
    case 2: return { content: pad(buildStep2Content(guildId)), components: buildStep2Components(guildId) };
    case 3: return { content: pad(buildStep3ChannelsContent(guildId, guild)), components: buildStep3ChannelsComponents(guildId, guild) };
    case 4: return { content: pad(buildStep4Content(guildId)), components: buildStep4Components(guildId) };
    case 5: return { content: pad(buildStep5VocalContent(guildId)), components: buildStep5VocalComponents(guildId) };
    case 6: return { content: pad(buildStep6Content_Games(guildId)), components: buildStep6Components_Games(guildId) };
    case 7: return { content: pad(buildStep7Content(guildId)), components: buildStep7Components(guildId) };
    default: return { content: pad(buildStep8Summary(guildId)), components: buildStep8Components(guildId) };
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
  const savedStep = Number(getGuildSetting(guildId, 'setup', 'step', 0));
  const step = (savedStep >= 1 && savedStep <= TOTAL_STEPS) ? savedStep : 1;
  if (step === 1) {
    setGuildSetting(guildId, 'setup', 'step', 1);
    setGradeCursor(guildId, 0);
  } else if (step === 3) {
    const slots = getActiveSlotsForInstall(guildId, guild);
    const anyConfigured = slots.some((s) => getGuildSetting(guildId, s.settingSection, s.settingKey, null));
    if (anyConfigured) {
      autoPositionChannelCursor(guildId, guild);
    } else {
      setChannelCursor(guildId, 0);
    }
  }
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

async function advanceToStep2AfterSecurity(interaction, guildId) {
  const nextStep = 2;
  setGuildSetting(guildId, 'setup', 'step', nextStep);
  await interaction.message.delete().catch(() => {});
  const wizardChannel = interaction.channel;
  if (!wizardChannel) return;
  const msgs = await wizardChannel.messages.fetch({ limit: 20 }).catch(() => null);
  if (!msgs) return;
  const botId = interaction.client.user.id;
  const wizardMsg = msgs.find((m) => m.author.id === botId && m.components.length > 0)
    ?? msgs.find((m) => m.author.id === botId);
  if (wizardMsg) {
    await wizardMsg.edit(buildStepPayload(guildId, interaction.guild, nextStep)).catch((err) => {
      logger.warn(`[security] failed to edit wizardMsg: ${err?.message}`);
    });
  } else {
    logger.warn('[security] no wizardMsg found, sending new');
    await wizardChannel.send(buildStepPayload(guildId, interaction.guild, nextStep)).catch(() => {});
  }
}

function buildSecurityComponents(dangerous, unused, _, resolvedIds = new Set()) {
  const rows = [];
  const allResolved = !hasUnresolvedIssues(dangerous, unused, resolvedIds);

  const unusedSlot = unused.length > 0 ? 1 : 0;
  const dangerousSlots = Math.min(dangerous.length, 4 - unusedSlot);

  for (const r of dangerous.slice(0, dangerousSlots)) {
    const resolved = resolvedIds.has(r.id);
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.securityRoleAction}:${r.id}`)
        .setLabel(resolved ? `🟢 Réglé — @${r.name}`.slice(0, 80) : `🔐 Régler le problème — @${r.name}`.slice(0, 80))
        .setStyle(resolved ? ButtonStyle.Success : ButtonStyle.Danger)
        .setDisabled(resolved)
    ));
  }

  if (unused.length === 1) {
    const r = unused[0];
    const resolved = resolvedIds.has(r.id);
    if (!resolved) {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_IDS.securityDeleteUnused}:${r.id}`)
          .setLabel(_('roleSecurity.btnDelete', { name: r.name }).slice(0, 40))
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_IDS.securityKeepUnused}:${r.id}`)
          .setLabel(_('roleSecurity.btnKeep', { name: r.name }).slice(0, 40))
          .setStyle(ButtonStyle.Secondary)
      ));
    }
  } else if (unused.length > 1) {
    const allUnusedResolved = unused.every(r => resolvedIds.has(r.id));
    if (!allUnusedResolved) {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.securityDeleteAllUnused)
          .setLabel(_('roleSecurity.btnDeleteAll', { count: unused.length }).slice(0, 80))
          .setStyle(ButtonStyle.Danger)
      ));
    }
  }

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.securityContinue)
      .setLabel(allResolved ? '✅ Continuer' : _('roleSecurity.btnContinue'))
      .setStyle(allResolved ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(false)
  ));

  return rows;
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

  if (interaction.locale && !getGuildSetting(guildId, 'i18n', 'language', null)) {
    const { detectLanguageFromLocale: _dlfl, setGuildLanguage: _sgl } = require('../i18n');
    _sgl(guildId, _dlfl(interaction.locale));
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

  if (interaction.customId === CUSTOM_IDS.toggleInviteGrade) {
    const current = Boolean(getGuildSetting(guildId, 'setup', 'invite_grade_enabled', true));
    setGuildSetting(guildId, 'setup', 'invite_grade_enabled', !current);
    await renderStep(interaction, 1);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.createRolesAuto) {
    await interaction.deferUpdate().catch(() => {});
    const guild = interaction.guild;
    const conflicting = [];
    for (const grade of ORDERED_GRADES) {
      const label = gradeLabel(grade).toLowerCase();
      const existing = guild?.roles?.cache
        ? [...guild.roles.cache.values()].find(
            (r) => r.name.toLowerCase() === label && !r.managed && r.id !== guild.roles.everyone?.id
          )
        : null;
      if (existing) conflicting.push({ grade, role: existing });
    }
    if (conflicting.length > 0) {
      const names = conflicting.map((c) => `\`${gradeLabel(c.grade)}\``).join(', ');
      const warnContent = [
        '⚠️ **Des rôles avec les mêmes noms existent déjà sur ce serveur.**',
        `> Rôles concernés : ${names}`,
        '',
        '**Que voulez-vous faire ?**',
        '> 🔗 **Transférer** — Guardian utilise ces rôles existants et conserve les membres déjà assignés.',
        '> 🗑️ **Recréer** — Guardian supprime ces rôles et en crée de nouveaux (les membres perdent ces rôles).'
      ].join('\n');
      const warnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.transferExistingRoles)
          .setStyle(ButtonStyle.Primary)
          .setLabel('🔗 Transférer les rôles existants'),
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.recreateRoles)
          .setStyle(ButtonStyle.Danger)
          .setLabel('🗑️ Supprimer et recréer')
      );
      await interaction.message.edit({ content: warnContent, components: [warnRow] }).catch(async () => {
        await interaction.channel?.send({ content: warnContent, components: [warnRow] });
      });
      return true;
    }
    await createRolesAutoHelper(interaction, guild, guildId);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.transferExistingRoles) {
    await interaction.deferUpdate().catch(() => {});
    const guild = interaction.guild;
    for (const grade of ORDERED_GRADES) {
      const label = gradeLabel(grade).toLowerCase();
      const existing = guild?.roles?.cache
        ? [...guild.roles.cache.values()].find(
            (r) => r.name.toLowerCase() === label && !r.managed && r.id !== guild.roles.everyone?.id
          )
        : null;
      if (existing) {
        setGradeRole(guildId, grade, existing.id);
      }
    }
    setGuildSetting(guildId, 'setup', 'roles_auto_created', true);
    setGuildSetting(guildId, 'setup', 'fresh_install', false);
    setGradeCursor(guildId, 0);
    await renderStep(interaction, 1);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.recreateRoles) {
    await interaction.deferUpdate().catch(() => {});
    const guild = interaction.guild;
    for (const grade of ORDERED_GRADES) {
      const label = gradeLabel(grade).toLowerCase();
      const existing = guild?.roles?.cache
        ? [...guild.roles.cache.values()].filter(
            (r) => r.name.toLowerCase() === label && !r.managed && r.id !== guild.roles.everyone?.id
          )
        : [];
      for (const r of existing) {
        await r.delete('Guardian setup — recréation des rôles').catch(() => {});
      }
    }
    await createRolesAutoHelper(interaction, guild, guildId);
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
    setGradeRole(guildId, gradeName, roleId);
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
      if (cursor >= activeSlots.length - 1) {
        const generalSlot = activeSlots.find((s) => s.key === 'general');
        const generalId = generalSlot ? getGuildSetting(guildId, generalSlot.settingSection, generalSlot.settingKey, null) : null;
        if (!generalId) {
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
    let deferredReply = false;
    try { await interaction.deferReply({ ephemeral: true }); deferredReply = true; } catch {}
    let game;
    try {
      game = addSetupGame(guildId, { name, steam_app_id: steamId, galerie_enabled: false, changelog_enabled: true });
      logger.info('Game added (non-Steam)', { guildId, name: game.name, steam_app_id: game.steam_app_id });
    } catch (err) {
      logger.error('addGameConfirmModal: addSetupGame failed', { error: err?.message });
      if (deferredReply) await interaction.deleteReply().catch(() => {});
      return true;
    }
    const confirmMsg = [
      `✅ **Jeu ajouté : ${game.name}**`,
      game.steam_app_id ? `> Steam ID : \`${game.steam_app_id}\`` : '> Jeu non Steam — le suivi des mises à jour Steam ne sera pas disponible.',
      '',
      'Tu peux modifier ce jeu à tout moment avec le bouton ✏️.'
    ].join('\n');
    try { const sent = await interaction.channel.send({ content: confirmMsg }); if (sent?.deletable !== false) setTimeout(() => sent?.delete().catch(() => {}), 5000); } catch {}
    if (deferredReply) await interaction.deleteReply().catch(() => {});
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
    let deferredReply = false;
    try { await interaction.deferReply({ ephemeral: true }); deferredReply = true; } catch {}
    const wizardMsg = await interaction.channel.messages.fetch({ limit: 20 })
      .then((msgs) => msgs.find((m) => m.author?.id === interaction.client?.user?.id && m.components?.length > 0))
      .catch(() => null);
    if (wizardMsg) {
      const fakeIx = { guildId, guild: interaction.guild, message: wizardMsg, channel: interaction.channel, deferUpdate: async () => {} };
      await renderStep(fakeIx, 6).catch((err) => logger.error('editGameModal: renderStep failed', { error: err?.message }));
    }
    if (deferredReply) await interaction.deleteReply().catch(() => {});
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
    const securityContent = buildSecurityCheckContent(dangerous, unused, _s);
    if (securityContent) {
      const rows = buildSecurityComponents(dangerous, unused, _s);
      await interaction.channel.send({ content: securityContent, components: rows }).catch(() => {}); 
    } else {
      const nextStep = 2;
      setGuildSetting(guildId, 'setup', 'step', nextStep);
      const wizardChannel = interaction.channel;
      if (wizardChannel) {
        const msgs = await wizardChannel.messages.fetch({ limit: 20 }).catch(() => null);
        const botId = interaction.client.user.id;
        const wizardMsg = msgs?.find((m) => m.author.id === botId && m.components.length > 0)
          ?? msgs?.find((m) => m.author.id === botId);
        if (wizardMsg) {
          await wizardMsg.edit(buildStepPayload(guildId, guild, nextStep)).catch(() => {});
        } else {
          await wizardChannel.send(buildStepPayload(guildId, guild, nextStep)).catch(() => {});
        }
      }
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
    const secContent = buildSecurityCheckContent(dRA, uRA, _ra, acknowledged);
    if (secContent) {
      await interaction.update({ content: secContent, components: buildSecurityComponents(dRA, uRA, _ra, acknowledged) }).catch(() => {
        interaction.deferUpdate().catch(() => {});
      });
    } else {
      await interaction.deferUpdate().catch(() => {});
    }
    if (msg) await replyEphemeral(interaction, msg).catch(() => {});
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
    setGameLinkCursor(guildId, 0);
    setGameLinkActiveType(guildId, null);
    for (const g of games) {
      const existing = listSetupGames(guildId).find((sg) => sg.name.toLowerCase() === (g.steamName || g.baseName).toLowerCase());
      if (!existing) addSetupGame(guildId, { name: g.steamName || g.baseName, steam_app_id: g.steamAppId || null });
    }
    await interaction.message.edit({
      content: buildGameLinkContent(guildId) + '\n\u200b',
      components: buildGameLinkComponents(guildId, interaction.guild)
    }).catch(() => {});
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.gameDetectSkip) {
    await interaction.deferUpdate().catch(() => {});
    setGuildSetting(guildId, 'setup', 'step', 3);
    setChannelCursor(guildId, 0);
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
      await renderStep(interaction, 3);
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

  return false;
}

// ─── Nouvelles options MAJ helpers ──────────────────────────────────────────

function semverToInt(v) {
  const [major = 0, minor = 0, patch = 0] = (v || '0.0.0').split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}

function getPendingNewOptions(guildId, guild) {
  const installVersion = getGuildSetting(guildId, 'bot', 'install_version', null);
  if (!installVersion) return [];
  const installInt = semverToInt(installVersion);
  const slots = guild ? getFilteredSlots(guild) : CHANNEL_SLOTS;
  return slots.filter((slot) => {
    const slotInt = semverToInt(slot.addedInVersion || '0.1.0');
    if (slotInt <= installInt) return false;
    const configured = getGuildSetting(guildId, slot.settingSection, slot.settingKey, null);
    return !configured;
  });
}

function buildNewOptionsContent(guildId, guild) {
  const pending = getPendingNewOptions(guildId, guild);
  const cursor = getGuildSetting(guildId, 'setup', 'new_options_cursor', 0);
  const slot = pending[cursor];
  if (!slot) return '✅ Toutes les nouvelles options ont été configurées.';
  return [
    `## 🆕 Nouvelles options disponibles depuis votre installation (${cursor + 1}/${pending.length})`,
    '',
    `**${slot.emoji} ${slot.label}**`,
    `> ${slot.desc}`,
    '',
    `Lier un channel existant ou ignorer pour laisser Guardian le créer.`
  ].join('\n');
}

function buildNewOptionsComponents(guildId, guild) {
  const pending = getPendingNewOptions(guildId, guild);
  const cursor = getGuildSetting(guildId, 'setup', 'new_options_cursor', 0);
  const slot = pending[cursor];
  if (!slot) return [];
  const isLast = cursor >= pending.length - 1;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.channelSelectPrefix}:${slot.key}`)
      .setLabel(`Lier ${slot.label}`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(isLast ? CUSTOM_IDS.newOptionsSkip : CUSTOM_IDS.newOptionsNext)
      .setLabel(isLast ? 'Terminer' : 'Passer →')
      .setStyle(ButtonStyle.Secondary)
  );
  return [row];
}

function buildNewOptionsDoneContent(guildId) {
  return [
    '## ✅ Nouvelles options configurées',
    '',
    'Toutes les nouvelles options ont été traitées. Tu peux maintenant finaliser le setup.',
    '',
    '> Appuie sur **Finaliser** pour terminer.'
  ].join('\n');
}

function buildNewOptionsDoneRow(guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.finalize)
      .setLabel('Finaliser ✅')
      .setStyle(ButtonStyle.Success)
  );
}

module.exports = {
  CUSTOM_IDS,
  handleSetupInteraction,
  startWizardInChannel
};
