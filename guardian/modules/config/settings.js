const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const { CHANNEL_NAMES, GRADE_NAMES } = require('../../config');
const { getDb } = require('../../database/db');
const { t } = require('../../locales');
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { applyGuardianPermissions } = require('../initialisation/permissions');
const { provisionGuildStructure } = require('../initialisation/provision');
const logger = require('../logs/logger');

const PANEL_IDS = Object.freeze({
  channels: 'channels',
  membres: 'membres',
  vocaux: 'vocaux',
  changelogs: 'changelogs',
  comportement: 'comportement',
  guardian: 'guardian'
});

const CUSTOM_IDS = Object.freeze({
  channelsToggleSuggestions: 'config:channels:toggle:suggestions',
  channelsToggleServerList: 'config:channels:toggle:serverList',
  channelsToggleStatusBot: 'config:channels:toggle:statusBot',
  channelsToggleAfk: 'config:channels:toggle:afk',
  channelsToggleGameUpdates: 'config:channels:toggle:gameUpdates',

  membersToggleExpulsion: 'config:members:toggle:expulsion',
  membersExpulsionDaysDec: 'config:members:expulsionDays:dec',
  membersExpulsionDaysInc: 'config:members:expulsionDays:inc',

  vocauxDeleteDelayDec: 'config:vocaux:emptyDelay:dec',
  vocauxDeleteDelayInc: 'config:vocaux:emptyDelay:inc',
  vocauxMaxMembersDec: 'config:vocaux:maxMembers:dec',
  vocauxMaxMembersInc: 'config:vocaux:maxMembers:inc',

  changelogToggleAggregate: 'config:changelogs:toggle:aggregate',
  changelogIntervalDec: 'config:changelogs:interval:dec',
  changelogIntervalInc: 'config:changelogs:interval:inc',

  behaviorToggleEnabled: 'config:behavior:toggle:enabled',
  behaviorAlertDec: 'config:behavior:alert:dec',
  behaviorAlertInc: 'config:behavior:alert:inc',

  guardianRefresh: 'config:guardian:refresh',

  refreshChannels: 'config:refresh:channels',
  refreshMembers: 'config:refresh:membres',
  refreshVocaux: 'config:refresh:vocaux',
  refreshChangelogs: 'config:refresh:changelogs',
  refreshComportement: 'config:refresh:comportement',
  refreshGuardian: 'config:refresh:guardian'
});

const OPTIONAL_CHANNEL_KEYS = Object.freeze({
  suggestions_enabled: 'suggestions',
  server_list_enabled: CHANNEL_NAMES.serverList,
  status_bot_enabled: 'statut-bot',
  afk_enabled: 'AFK',
  game_updates_enabled: CHANNEL_NAMES.gameUpdates
});

const GRADE_ORDER = Object.freeze([
  GRADE_NAMES.invite,
  GRADE_NAMES.membre,
  GRADE_NAMES.moderateur,
  GRADE_NAMES.manager,
  GRADE_NAMES.owner
]);

function setGuildSetting(guildId, moduleName, key, value) {
  const db = getDb();
  db.prepare(
    `INSERT INTO guild_config (guild_id, module, key, value)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id, module, key)
     DO UPDATE SET value = excluded.value`
  ).run(guildId, moduleName, key, JSON.stringify(value));
}

function getGuildSetting(guildId, moduleName, key, fallback = null) {
  const db = getDb();
  const row = db
    .prepare('SELECT value FROM guild_config WHERE guild_id = ? AND module = ? AND key = ?')
    .get(guildId, moduleName, key);

  if (!row) {
    return fallback;
  }

  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

function formatSettingValue(value) {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function hasSameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getConfigLogChannel(guild) {
  return guild.channels.cache.find(
    (channel) => channel.name === CHANNEL_NAMES.configLogs && channel.isTextBased()
  );
}

async function logConfigMutation(guild, actorId, moduleName, key, oldValue, newValue) {
  const configLogChannel = getConfigLogChannel(guild);
  if (!configLogChannel) {
    return;
  }

  const lines = [
    t('config.logs.title', {}, { guildId: guild.id }),
    `${t('config.logs.actor', {}, { guildId: guild.id })} <@${actorId}>`,
    `${t('config.logs.key', {}, { guildId: guild.id })} ${moduleName}.${key}`,
    `${t('config.logs.oldValue', {}, { guildId: guild.id })} ${formatSettingValue(oldValue)}`,
    `${t('config.logs.newValue', {}, { guildId: guild.id })} ${formatSettingValue(newValue)}`
  ];

  await configLogChannel.send({ content: lines.join('\n') }).catch((error) => {
    logger.error('Failed to send config mutation log', error);
  });
}

async function setGuildSettingWithLog(guild, actorId, moduleName, key, value) {
  const oldValue = getGuildSetting(guild.id, moduleName, key, null);
  setGuildSetting(guild.id, moduleName, key, value);

  if (hasSameValue(oldValue, value)) {
    return;
  }

  await logConfigMutation(guild, actorId, moduleName, key, oldValue, value);
}

function findChannelByName(guild, channelName) {
  return guild.channels.cache.find(
    (channel) => channel.name === channelName && channel.type !== ChannelType.GuildCategory
  );
}

function getGuardianRoleIds(guildId) {
  const mappings = getGradeMappings(guildId);
  return Object.values(mappings).filter(Boolean);
}

async function hideChannel(guild, channelName) {
  const channel = findChannelByName(guild, channelName);
  if (!channel) {
    return;
  }

  const denyView = [PermissionFlagsBits.ViewChannel];
  const overwrites = [
    { id: guild.roles.everyone.id, deny: denyView },
    ...getGuardianRoleIds(guild.id).map((roleId) => ({ id: roleId, deny: denyView }))
  ];

  await channel.permissionOverwrites.set(overwrites).catch((error) => {
    logger.error(`Failed to hide channel ${channelName}`, error);
  });
}

async function syncOptionalChannelsVisibility(guild) {
  await provisionGuildStructure(guild);

  for (const [settingKey, channelName] of Object.entries(OPTIONAL_CHANNEL_KEYS)) {
    const enabled = Boolean(getGuildSetting(guild.id, 'channels', settingKey, true));
    if (!enabled) {
      await hideChannel(guild, channelName);
    }
  }

  await applyGuardianPermissions(guild);

  for (const [settingKey, channelName] of Object.entries(OPTIONAL_CHANNEL_KEYS)) {
    const enabled = Boolean(getGuildSetting(guild.id, 'channels', settingKey, true));
    if (!enabled) {
      await hideChannel(guild, channelName);
    }
  }
}

function memberHasGradeOrAbove(guildId, member, targetGrade) {
  const mappings = getGradeMappings(guildId);
  const targetIndex = GRADE_ORDER.indexOf(targetGrade);
  if (targetIndex < 0) {
    return false;
  }

  let maxIndex = -1;
  const hasRole = (roleId) => {
    if (!roleId || !member?.roles) {
      return false;
    }

    if (member.roles.cache && typeof member.roles.cache.has === 'function') {
      return member.roles.cache.has(roleId);
    }

    if (Array.isArray(member.roles)) {
      return member.roles.includes(roleId);
    }

    return false;
  };

  for (const grade of GRADE_ORDER) {
    const roleId = mappings[grade];
    if (hasRole(roleId)) {
      maxIndex = Math.max(maxIndex, GRADE_ORDER.indexOf(grade));
    }
  }

  return maxIndex >= targetIndex;
}

function boolFlag(value, guildId) {
  return value ? t('setup.enabled', {}, { guildId }) : t('setup.disabled', {}, { guildId });
}

function buildPanelComponents(panelId, guildId) {
  if (panelId === PANEL_IDS.channels) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.channelsToggleSuggestions).setStyle(ButtonStyle.Secondary).setLabel('Suggestions'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.channelsToggleServerList).setStyle(ButtonStyle.Secondary).setLabel('Liste serveurs'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.channelsToggleStatusBot).setStyle(ButtonStyle.Secondary).setLabel('Statut bot')
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.channelsToggleAfk).setStyle(ButtonStyle.Secondary).setLabel('AFK'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.channelsToggleGameUpdates).setStyle(ButtonStyle.Secondary).setLabel('Game updates'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.refreshChannels).setStyle(ButtonStyle.Primary).setLabel(t('config.refresh', {}, { guildId }))
      )
    ];
  }

  if (panelId === PANEL_IDS.membres) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.membersToggleExpulsion).setStyle(ButtonStyle.Secondary).setLabel('Expulsion auto'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.membersExpulsionDaysDec).setStyle(ButtonStyle.Secondary).setLabel('-1 jour'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.membersExpulsionDaysInc).setStyle(ButtonStyle.Secondary).setLabel('+1 jour')
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.refreshMembers).setStyle(ButtonStyle.Primary).setLabel(t('config.refresh', {}, { guildId }))
      )
    ];
  }

  if (panelId === PANEL_IDS.vocaux) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.vocauxDeleteDelayDec).setStyle(ButtonStyle.Secondary).setLabel('-1 min vide'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.vocauxDeleteDelayInc).setStyle(ButtonStyle.Secondary).setLabel('+1 min vide'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.vocauxMaxMembersDec).setStyle(ButtonStyle.Secondary).setLabel('-1 max membres'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.vocauxMaxMembersInc).setStyle(ButtonStyle.Secondary).setLabel('+1 max membres')
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.refreshVocaux).setStyle(ButtonStyle.Primary).setLabel(t('config.refresh', {}, { guildId }))
      )
    ];
  }

  if (panelId === PANEL_IDS.changelogs) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.changelogToggleAggregate).setStyle(ButtonStyle.Secondary).setLabel('Agrégation updates'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.changelogIntervalDec).setStyle(ButtonStyle.Secondary).setLabel('-5 min fréquence'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.changelogIntervalInc).setStyle(ButtonStyle.Secondary).setLabel('+5 min fréquence')
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.refreshChangelogs).setStyle(ButtonStyle.Primary).setLabel(t('config.refresh', {}, { guildId }))
      )
    ];
  }

  if (panelId === PANEL_IDS.comportement) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.behaviorToggleEnabled).setStyle(ButtonStyle.Secondary).setLabel('Score comportement'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.behaviorAlertDec).setStyle(ButtonStyle.Secondary).setLabel('-5 seuil alerte'),
        new ButtonBuilder().setCustomId(CUSTOM_IDS.behaviorAlertInc).setStyle(ButtonStyle.Secondary).setLabel('+5 seuil alerte')
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(CUSTOM_IDS.refreshComportement).setStyle(ButtonStyle.Primary).setLabel(t('config.refresh', {}, { guildId }))
      )
    ];
  }

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(CUSTOM_IDS.guardianRefresh).setStyle(ButtonStyle.Primary).setLabel(t('config.refresh', {}, { guildId }))
    )
  ];
}

function buildPanelContent(panelId, guildId) {
  if (panelId === PANEL_IDS.channels) {
    const values = {
      suggestions: boolFlag(Boolean(getGuildSetting(guildId, 'channels', 'suggestions_enabled', true)), guildId),
      serverList: boolFlag(Boolean(getGuildSetting(guildId, 'channels', 'server_list_enabled', false)), guildId),
      statusBot: boolFlag(Boolean(getGuildSetting(guildId, 'channels', 'status_bot_enabled', true)), guildId),
      afk: boolFlag(Boolean(getGuildSetting(guildId, 'channels', 'afk_enabled', true)), guildId),
      gameUpdates: boolFlag(Boolean(getGuildSetting(guildId, 'channels', 'game_updates_enabled', true)), guildId)
    };

    return t('config.channelsPanel', values, { guildId });
  }

  if (panelId === PANEL_IDS.membres) {
    return t(
      'config.membersPanel',
      {
        expulsion: boolFlag(Boolean(getGuildSetting(guildId, 'members', 'invite_expulsion_enabled', true)), guildId),
        days: Number(getGuildSetting(guildId, 'members', 'invite_expulsion_days', 30))
      },
      { guildId }
    );
  }

  if (panelId === PANEL_IDS.vocaux) {
    return t(
      'config.vocauxPanel',
      {
        emptyDelay: Math.max(1, Number(getGuildSetting(guildId, 'vocaux', 'empty_delete_minutes', 5))),
        maxMembers: Math.max(0, Number(getGuildSetting(guildId, 'vocaux', 'max_members', 0)))
      },
      { guildId }
    );
  }

  if (panelId === PANEL_IDS.changelogs) {
    return t(
      'config.changelogsPanel',
      {
        aggregate: boolFlag(Boolean(getGuildSetting(guildId, 'changelogs', 'aggregate_game_updates', true)), guildId),
        interval: Math.max(5, Number(getGuildSetting(guildId, 'changelogs', 'check_interval_minutes', 60)))
      },
      { guildId }
    );
  }

  if (panelId === PANEL_IDS.comportement) {
    return t(
      'config.behaviorPanel',
      {
        enabled: boolFlag(Boolean(getGuildSetting(guildId, 'moderation', 'behavior_score_enabled', false)), guildId),
        alert: Math.max(0, Number(getGuildSetting(guildId, 'behavior', 'alert_threshold', 150)))
      },
      { guildId }
    );
  }

  return t('config.guardianPanel', {}, { guildId });
}

function panelFromRefreshCustomId(customId) {
  if (customId === CUSTOM_IDS.refreshChannels) {
    return PANEL_IDS.channels;
  }
  if (customId === CUSTOM_IDS.refreshMembers) {
    return PANEL_IDS.membres;
  }
  if (customId === CUSTOM_IDS.refreshVocaux) {
    return PANEL_IDS.vocaux;
  }
  if (customId === CUSTOM_IDS.refreshChangelogs) {
    return PANEL_IDS.changelogs;
  }
  if (customId === CUSTOM_IDS.refreshComportement) {
    return PANEL_IDS.comportement;
  }
  if (customId === CUSTOM_IDS.refreshGuardian || customId === CUSTOM_IDS.guardianRefresh) {
    return PANEL_IDS.guardian;
  }
  return null;
}

function requiredGradeForPanel(panelId) {
  if (panelId === PANEL_IDS.comportement || panelId === PANEL_IDS.guardian) {
    return GRADE_NAMES.owner;
  }

  return GRADE_NAMES.manager;
}

function findPanelConfigByChannelName(channelName) {
  return [
    { panelId: PANEL_IDS.channels, channelName: 'channels', refreshId: CUSTOM_IDS.refreshChannels },
    { panelId: PANEL_IDS.membres, channelName: 'membres', refreshId: CUSTOM_IDS.refreshMembers },
    { panelId: PANEL_IDS.vocaux, channelName: 'vocaux', refreshId: CUSTOM_IDS.refreshVocaux },
    { panelId: PANEL_IDS.changelogs, channelName: 'changelogs', refreshId: CUSTOM_IDS.refreshChangelogs },
    { panelId: PANEL_IDS.comportement, channelName: 'comportement', refreshId: CUSTOM_IDS.refreshComportement },
    { panelId: PANEL_IDS.guardian, channelName: 'guardian', refreshId: CUSTOM_IDS.refreshGuardian }
  ].find((item) => item.channelName === channelName);
}

function messageIsPanelMessage(message, refreshId) {
  return message.author.id === message.client.user.id && message.components.some((row) =>
    row.components.some((component) => component.customId === refreshId)
  );
}

async function ensureSingleConfigPanel(guild, panelConfig) {
  const channel = guild.channels.cache.find((item) => item.name === panelConfig.channelName && item.isTextBased());
  if (!channel) {
    return;
  }

  const recent = await channel.messages.fetch({ limit: 30 }).catch(() => null);
  const existingPanel = recent?.find((message) => messageIsPanelMessage(message, panelConfig.refreshId));
  const content = buildPanelContent(panelConfig.panelId, guild.id);
  const components = buildPanelComponents(panelConfig.panelId, guild.id);

  if (existingPanel) {
    await existingPanel.edit({ content, components }).catch(() => undefined);
    return;
  }

  await channel.send({ content, components }).catch(() => undefined);
}

async function ensureConfigPanelsForGuild(guild) {
  const panelConfigs = [
    { panelId: PANEL_IDS.channels, channelName: 'channels', refreshId: CUSTOM_IDS.refreshChannels },
    { panelId: PANEL_IDS.membres, channelName: 'membres', refreshId: CUSTOM_IDS.refreshMembers },
    { panelId: PANEL_IDS.vocaux, channelName: 'vocaux', refreshId: CUSTOM_IDS.refreshVocaux },
    { panelId: PANEL_IDS.changelogs, channelName: 'changelogs', refreshId: CUSTOM_IDS.refreshChangelogs },
    { panelId: PANEL_IDS.comportement, channelName: 'comportement', refreshId: CUSTOM_IDS.refreshComportement },
    { panelId: PANEL_IDS.guardian, channelName: 'guardian', refreshId: CUSTOM_IDS.refreshGuardian }
  ];

  for (const panelConfig of panelConfigs) {
    await ensureSingleConfigPanel(guild, panelConfig);
  }
}

async function updatePanelMessage(interaction, panelId) {
  await interaction.update({
    content: buildPanelContent(panelId, interaction.guildId),
    components: buildPanelComponents(panelId, interaction.guildId)
  });
}

async function rejectInsufficientGrade(interaction) {
  await interaction.reply({
    content: t('config.forbidden', {}, { guildId: interaction.guildId }),
    ephemeral: true
  });
}

async function mutateBooleanSetting(interaction, moduleName, key, panelId) {
  const current = Boolean(getGuildSetting(interaction.guildId, moduleName, key, false));
  const next = !current;
  await setGuildSettingWithLog(interaction.guild, interaction.user.id, moduleName, key, next);

  if (moduleName === 'channels') {
    await syncOptionalChannelsVisibility(interaction.guild);
  }

  await updatePanelMessage(interaction, panelId);
}

async function mutateNumberSetting(interaction, moduleName, key, delta, min, max, panelId, step = 1) {
  const current = Number(getGuildSetting(interaction.guildId, moduleName, key, min));
  const next = Math.max(min, Math.min(max, current + (delta * step)));
  await setGuildSettingWithLog(interaction.guild, interaction.user.id, moduleName, key, next);
  await updatePanelMessage(interaction, panelId);
}

async function handleSettingsInteraction(interaction) {
  if (!interaction.guild || !interaction.guildId || !interaction.customId || !interaction.isButton()) {
    return false;
  }

  if (!interaction.customId.startsWith('config:')) {
    return false;
  }

  const panelConfig = findPanelConfigByChannelName(interaction.channel?.name || '');
  const panelIdFromRefresh = panelFromRefreshCustomId(interaction.customId);
  const panelId = panelIdFromRefresh || panelConfig?.panelId;
  if (!panelId) {
    await interaction.reply({
      content: t('config.invalidContext', {}, { guildId: interaction.guildId }),
      ephemeral: true
    });
    return true;
  }

  const minGrade = requiredGradeForPanel(panelId);
  if (!memberHasGradeOrAbove(interaction.guildId, interaction.member, minGrade)) {
    await rejectInsufficientGrade(interaction);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.refreshChannels ||
      interaction.customId === CUSTOM_IDS.refreshMembers ||
      interaction.customId === CUSTOM_IDS.refreshVocaux ||
      interaction.customId === CUSTOM_IDS.refreshChangelogs ||
      interaction.customId === CUSTOM_IDS.refreshComportement ||
      interaction.customId === CUSTOM_IDS.refreshGuardian ||
      interaction.customId === CUSTOM_IDS.guardianRefresh) {
    await updatePanelMessage(interaction, panelId);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.channelsToggleSuggestions) {
    await mutateBooleanSetting(interaction, 'channels', 'suggestions_enabled', PANEL_IDS.channels);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.channelsToggleServerList) {
    await mutateBooleanSetting(interaction, 'channels', 'server_list_enabled', PANEL_IDS.channels);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.channelsToggleStatusBot) {
    await mutateBooleanSetting(interaction, 'channels', 'status_bot_enabled', PANEL_IDS.channels);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.channelsToggleAfk) {
    await mutateBooleanSetting(interaction, 'channels', 'afk_enabled', PANEL_IDS.channels);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.channelsToggleGameUpdates) {
    await mutateBooleanSetting(interaction, 'channels', 'game_updates_enabled', PANEL_IDS.channels);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.membersToggleExpulsion) {
    await mutateBooleanSetting(interaction, 'members', 'invite_expulsion_enabled', PANEL_IDS.membres);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.membersExpulsionDaysDec) {
    await mutateNumberSetting(interaction, 'members', 'invite_expulsion_days', -1, 1, 365, PANEL_IDS.membres);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.membersExpulsionDaysInc) {
    await mutateNumberSetting(interaction, 'members', 'invite_expulsion_days', 1, 1, 365, PANEL_IDS.membres);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.vocauxDeleteDelayDec) {
    await mutateNumberSetting(interaction, 'vocaux', 'empty_delete_minutes', -1, 1, 60, PANEL_IDS.vocaux);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.vocauxDeleteDelayInc) {
    await mutateNumberSetting(interaction, 'vocaux', 'empty_delete_minutes', 1, 1, 60, PANEL_IDS.vocaux);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.vocauxMaxMembersDec) {
    await mutateNumberSetting(interaction, 'vocaux', 'max_members', -1, 0, 99, PANEL_IDS.vocaux);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.vocauxMaxMembersInc) {
    await mutateNumberSetting(interaction, 'vocaux', 'max_members', 1, 0, 99, PANEL_IDS.vocaux);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.changelogToggleAggregate) {
    await mutateBooleanSetting(interaction, 'changelogs', 'aggregate_game_updates', PANEL_IDS.changelogs);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.changelogIntervalDec) {
    await mutateNumberSetting(interaction, 'changelogs', 'check_interval_minutes', -1, 5, 240, PANEL_IDS.changelogs, 5);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.changelogIntervalInc) {
    await mutateNumberSetting(interaction, 'changelogs', 'check_interval_minutes', 1, 5, 240, PANEL_IDS.changelogs, 5);
    return true;
  }

  if (interaction.customId === CUSTOM_IDS.behaviorToggleEnabled) {
    await mutateBooleanSetting(interaction, 'moderation', 'behavior_score_enabled', PANEL_IDS.comportement);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.behaviorAlertDec) {
    await mutateNumberSetting(interaction, 'behavior', 'alert_threshold', -1, 0, 350, PANEL_IDS.comportement, 5);
    return true;
  }
  if (interaction.customId === CUSTOM_IDS.behaviorAlertInc) {
    await mutateNumberSetting(interaction, 'behavior', 'alert_threshold', 1, 0, 350, PANEL_IDS.comportement, 5);
    return true;
  }

  await interaction.reply({
    content: t('config.unsupported', {}, { guildId: interaction.guildId }),
    ephemeral: true
  });
  return true;
}

module.exports = {
  setGuildSetting,
  getGuildSetting,
  ensureConfigPanelsForGuild,
  handleSettingsInteraction
};
