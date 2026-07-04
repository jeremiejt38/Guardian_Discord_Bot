const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const { getDb } = require('../../database/db');
const { CATEGORIES, CHANNELS, GRADE_NAMES } = require('../../config');
const { getGuildSetting } = require('../config/settings');
const {
  getAvailableLanguages,
  getLanguageLabel,
  getGuildLanguage,
  setGuildLanguage,
  t,
  tForLanguage
} = require('../i18n');
const { markGuildInstalled } = require('./checkInstall');
const { provisionGuildGameStructures, buildOpenButtonRow } = require('../games/gameList');
const {
  findCategoryByName,
  findGuildTextChannelByName,
  findGuildVoiceChannelByName
} = require('../utils/channels');
const { replyEphemeral } = require('../utils/interactions');
const logger = require('../logs/logger');

const SETUP_INSTALL_BUTTON_ID = 'setup:install';
const SETUP_LANGUAGE_SELECT_ID = 'setup:language';

function getGradeRoleMap(guildId) {
  const db = getDb();
  const rows = db.prepare('SELECT grade_name, role_id FROM grades WHERE guild_id = ?').all(guildId);
  const roles = {};

  for (const row of rows) {
    if (row?.grade_name && row?.role_id) {
      roles[row.grade_name] = row.role_id;
    }
  }

  return roles;
}

async function ensureCategory(guild, name, permissionOverwrites) {
  const existing = findCategoryByName(guild, name);

  if (existing) {
    return existing;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites
  });
}

async function ensureTextChannel(guild, parentId, name, permissionOverwrites) {
  const existing = findGuildTextChannelByName(guild, name, parentId);

  if (existing) {
    await existing.edit({
      parent: parentId,
      permissionOverwrites
    });
    return existing;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites
  });
}

async function ensureVoiceChannel(guild, parentId, name, permissionOverwrites) {
  const existing = findGuildVoiceChannelByName(guild, name, parentId);

  if (existing) {
    await existing.edit({
      parent: parentId,
      permissionOverwrites
    });
    return existing;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: parentId,
    permissionOverwrites
  });
}

function buildGeneralPermissions(guild, roleMap) {
  const permissions = [
    {
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    }
  ];

  const inviteRoleId = roleMap[GRADE_NAMES.invite];
  if (inviteRoleId) {
    permissions.push({
      id: inviteRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      deny: [PermissionFlagsBits.ReadMessageHistory]
    });
  }

  return permissions;
}

function buildHiddenPermissions(guild, ownerId) {
  return [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: ownerId, allow: [PermissionFlagsBits.ViewChannel] }
  ];
}

function buildModerationPermissions(guild, roleMap, ownerId) {
  const permissions = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }
  ];

  const modPlusRoleIds = [
    roleMap[GRADE_NAMES.moderateur],
    roleMap[GRADE_NAMES.manager],
    roleMap[GRADE_NAMES.owner]
  ].filter(Boolean);

  if (modPlusRoleIds.length === 0) {
    permissions.push({
      id: ownerId,
      allow: [PermissionFlagsBits.ViewChannel]
    });
    return permissions;
  }

  for (const roleId of modPlusRoleIds) {
    permissions.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    });
  }

  return permissions;
}

function buildConfigPermissions(guild, roleMap, ownerId, minimumGrade) {
  const order = [
    GRADE_NAMES.invite,
    GRADE_NAMES.membre,
    GRADE_NAMES.moderateur,
    GRADE_NAMES.manager,
    GRADE_NAMES.owner
  ];

  const start = Math.max(order.indexOf(minimumGrade), 0);
  const allowedRoleIds = order.slice(start).map((grade) => roleMap[grade]).filter(Boolean);

  const permissions = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];

  if (allowedRoleIds.length === 0) {
    permissions.push({ id: ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
    return permissions;
  }

  for (const roleId of allowedRoleIds) {
    permissions.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    });
  }

  return permissions;
}

function buildViewThenActionPermissions(guild, roleMap, ownerId, viewMinimumGrade, actionMinimumGrade) {
  const order = [
    GRADE_NAMES.invite,
    GRADE_NAMES.membre,
    GRADE_NAMES.moderateur,
    GRADE_NAMES.manager,
    GRADE_NAMES.owner
  ];

  const viewIndex = Math.max(order.indexOf(viewMinimumGrade), 0);
  const actionIndex = Math.max(order.indexOf(actionMinimumGrade), 0);

  const viewRoleIds = order.slice(viewIndex).map((g) => roleMap[g]).filter(Boolean);
  const actionRoleIds = order.slice(actionIndex).map((g) => roleMap[g]).filter(Boolean);

  const permissions = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];

  // allow view for viewRoleIds
  for (const roleId of viewRoleIds) {
    permissions.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel] });
  }

  // allow send for actionRoleIds (also need view)
  for (const roleId of actionRoleIds) {
    permissions.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  }

  if (viewRoleIds.length === 0 && actionRoleIds.length === 0) {
    permissions.push({ id: ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  }

  return permissions;
}

function buildViewOnlyPermissions(guild, roleMap, ownerId, viewMinimumGrade) {
  const order = [
    GRADE_NAMES.invite,
    GRADE_NAMES.membre,
    GRADE_NAMES.moderateur,
    GRADE_NAMES.manager,
    GRADE_NAMES.owner
  ];

  const viewIndex = Math.max(order.indexOf(viewMinimumGrade), 0);
  const viewRoleIds = order.slice(viewIndex).map((g) => roleMap[g]).filter(Boolean);

  const permissions = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];
  for (const roleId of viewRoleIds) {
    permissions.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel] });
  }

  if (viewRoleIds.length === 0) {
    permissions.push({ id: ownerId, allow: [PermissionFlagsBits.ViewChannel] });
  }

  return permissions;
}

function buildRequestsPermissions(guild, roleMap) {
  const gradeRoleIds = [
    roleMap[GRADE_NAMES.invite],
    roleMap[GRADE_NAMES.membre],
    roleMap[GRADE_NAMES.moderateur],
    roleMap[GRADE_NAMES.manager],
    roleMap[GRADE_NAMES.owner]
  ].filter(Boolean);

  const base = [
    {
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [PermissionFlagsBits.SendMessages]
    }
  ];

  if (gradeRoleIds.length === 0) {
    base[0] = {
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    };
    return base;
  }

  for (const roleId of gradeRoleIds) {
    base.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    });
  }

  return base;
}

async function seedFaqMessages(channel) {
  if (channel.lastMessageId) {
    return;
  }

  const language = getGuildLanguage(channel.guild.id);
  const defaultMessages = [
    tForLanguage(language, 'init.faq1'),
    tForLanguage(language, 'init.faq2'),
    tForLanguage(language, 'init.faq3')
  ];

  for (const message of defaultMessages) {
    await channel.send(message);
  }
}

async function seedVoiceCreateMessage(channel) {
  if (channel.lastMessageId) {
    return;
  }

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('creer:open').setLabel(t(channel.guild.id, 'init.createChannel')).setStyle(ButtonStyle.Primary)
  );

  await channel.send({ content: t(channel.guild.id, 'init.voiceCreate'), components: [button] });
}

async function seedGuardianConfigMessage(channel, options = {}) {
  if (channel.lastMessageId) {
    return;
  }

  const payload = {
    content: t(channel.guild.id, 'init.configReady', { channel: channel.name })
  };

  if (options.withGameListButton) {
    payload.components = [buildOpenButtonRow(channel.guild.id)];
  }

  await channel.send(payload);
}

async function seedServerManagementPlaceholder(channel) {
  if (channel.lastMessageId) {
    return;
  }

  await channel.send(t(channel.guild.id, 'init.serverPlaceholder'));
}

async function seedServeursListMessage(channel) {
  if (channel.lastMessageId) return;

  const db = getDb();
  const rows = db.prepare('SELECT server_id, name, game, ip, port, last_status FROM servers_jeu WHERE guild_id = ?').all(channel.guild.id);

  let content = '**Liste des serveurs communautaires**\n';
  if (rows.length === 0) {
    content += '_Aucun serveur ajouté._\n';
  } else {
    for (const r of rows) {
      content += `• **${r.name}** (${r.game}) — ${r.ip}:${r.port} — Status: ${r.last_status || 'unknown'}\n`;
    }
  }

  const addButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('servers:add').setLabel(t(channel.guild.id, 'init.addServer')).setStyle(ButtonStyle.Primary)
  );

  await channel.send({ content, components: [addButton] });
}

async function createInformationsArea(guild, roleMap) {
  const informationsCategory = await ensureCategory(guild, CATEGORIES.informations, [
    { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel] }
  ]);

  await ensureTextChannel(guild, informationsCategory.id, CHANNELS.welcome, [
    {
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [PermissionFlagsBits.SendMessages]
    }
  ]);

  const faqChannel = await ensureTextChannel(guild, informationsCategory.id, CHANNELS.faq, [
    {
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [PermissionFlagsBits.SendMessages]
    }
  ]);

  await ensureTextChannel(guild, informationsCategory.id, CHANNELS.requests, buildRequestsPermissions(guild, roleMap));
  await seedFaqMessages(faqChannel);
}

async function createCommunauteArea(guild, roleMap, ownerId) {
  const communauteCategory = await ensureCategory(guild, CATEGORIES.communaute, [
    { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel] }
  ]);

  const generalEnabled = getGuildSetting(guild.id, 'communaute', 'general_enabled', true);
  const permissions = generalEnabled
    ? buildGeneralPermissions(guild, roleMap)
    : buildHiddenPermissions(guild, ownerId);

  await ensureTextChannel(guild, communauteCategory.id, CHANNELS.general, permissions);
}

async function createVocalArea(guild, ownerId) {
  const vocauxCategory = await ensureCategory(guild, CATEGORIES.vocaux, [
    { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel] }
  ]);

  const voiceCreateChannel = await ensureTextChannel(guild, vocauxCategory.id, CHANNELS.voiceCreate, [
    {
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    }
  ]);

  await ensureVoiceChannel(guild, vocauxCategory.id, CHANNELS.voiceGeneral, [
    {
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
    }
  ]);

  const afkEnabled = getGuildSetting(guild.id, 'vocaux', 'afk_enabled', true);
  const afkPermissions = afkEnabled
    ? [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
        }
      ]
    : buildHiddenPermissions(guild, ownerId);

  await ensureVoiceChannel(guild, vocauxCategory.id, CHANNELS.voiceAfk, afkPermissions);
  await seedVoiceCreateMessage(voiceCreateChannel);
}

async function createModerationArea(guild, roleMap, ownerId) {
  const moderationPermissions = buildModerationPermissions(guild, roleMap, ownerId);
  const moderationCategory = await ensureCategory(guild, CATEGORIES.moderation, moderationPermissions);

  await ensureTextChannel(guild, moderationCategory.id, CHANNELS.reports, moderationPermissions);
  await ensureTextChannel(guild, moderationCategory.id, CHANNELS.autoModeration, moderationPermissions);
  await ensureTextChannel(guild, moderationCategory.id, CHANNELS.behavior, moderationPermissions);
  await ensureTextChannel(guild, moderationCategory.id, CHANNELS.moderationLogs, moderationPermissions);
}

async function createConfigurationArea(guild, roleMap, ownerId) {
  const configurationCategory = await ensureCategory(guild, CATEGORIES.configuration, buildHiddenPermissions(guild, ownerId));

  const channels = [
    // visible to members (opt-in features)
    { name: CHANNELS.gameChannels, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.membre) },
    { name: CHANNELS.gameList, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.membre) },

    // servers listing and management
    { name: CHANNELS.jeuxServeur, permissions: buildViewThenActionPermissions(guild, roleMap, ownerId, GRADE_NAMES.moderateur, GRADE_NAMES.manager) },
    { name: CHANNELS.serverList, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.moderateur) },

    // bot & status
    { name: CHANNELS.statutBot, permissions: buildViewThenActionPermissions(guild, roleMap, ownerId, GRADE_NAMES.moderateur, GRADE_NAMES.manager) },
    { name: CHANNELS.botConfig, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },

    // admin configuration channels
    { name: CHANNELS.membres, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.channelsConfig, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.vocauxConfig, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.jeux, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.changelogs, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.suggestions, permissions: buildViewOnlyPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.approveGames, permissions: buildViewThenActionPermissions(guild, roleMap, ownerId, GRADE_NAMES.moderateur, GRADE_NAMES.manager) },
    { name: CHANNELS.annonces, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.serveursJeu, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },

    // logs and guardian config
    { name: CHANNELS.configLogs, permissions: buildViewOnlyPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.guardian, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },

    // legacy management channel (future Pterodactyl control)
    { name: CHANNELS.serverManagement, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.owner) }
  ];

  for (const item of channels) {
    const channel = await ensureTextChannel(guild, configurationCategory.id, item.name, item.permissions);
    if (item.name === CHANNELS.serverManagement) {
      await seedServerManagementPlaceholder(channel);
    } else if (item.name === CHANNELS.jeuxServeur) {
      await seedServeursListMessage(channel);
    } else {
      const withGameListButton = item.name === CHANNELS.gameChannels || item.name === CHANNELS.gameList;
      await seedGuardianConfigMessage(channel, { withGameListButton });
    }
  }
}

function buildSetupInstallButtonRow(language) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(SETUP_INSTALL_BUTTON_ID)
      .setLabel(tForLanguage(language, 'setup.installButton'))
      .setStyle(ButtonStyle.Primary)
  );
}

function buildSetupLanguageSelectRow(language) {
  const options = getAvailableLanguages().map((code) => ({
    label: getLanguageLabel(code).slice(0, 100),
    value: code,
    default: code === language
  }));

  if (options.length === 0) {
    options.push({
      label: 'fr',
      value: 'fr',
      default: true
    });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(SETUP_LANGUAGE_SELECT_ID)
      .setPlaceholder(tForLanguage(language, 'setup.languagePlaceholder'))
      .addOptions(options)
  );
}

function resolveSetupLanguage(guildId) {
  return getGuildLanguage(guildId);
}

function getSetupMessageContent(language) {
  const languageLabel = getLanguageLabel(language);
  return [
    tForLanguage(language, 'setup.welcome'),
    tForLanguage(language, 'setup.instructions'),
    tForLanguage(language, 'setup.currentLanguage', { language: languageLabel })
  ].join(' ');
}

async function ensureSetupInstallPrompt(guild) {
  const setupCategory = findCategoryByName(guild, CATEGORIES.setup);

  if (!setupCategory) {
    return;
  }

  const setupChannel = findGuildTextChannelByName(guild, CHANNELS.setup, setupCategory.id);

  if (!setupChannel) {
    return;
  }

  const messages = await setupChannel.messages.fetch({ limit: 20 });
  const hasInstallButton = messages.some((message) =>
    message.author?.id === guild.client.user.id
    && message.components?.some((row) => row.components?.some((component) => component.customId === SETUP_INSTALL_BUTTON_ID))
  );

  if (!hasInstallButton) {
    const language = resolveSetupLanguage(guild.id);
    await setupChannel.send(buildSetupInstallMessagePayloadForGuild(language));
  }
}

function buildSetupInstallMessagePayloadForGuild(language) {
  return {
    content: getSetupMessageContent(language),
    components: [buildSetupLanguageSelectRow(language), buildSetupInstallButtonRow(language)]
  };
}

async function runSetupInstallationPhases(guild, ownerId) {
  const roleMap = getGradeRoleMap(guild.id);

  await createInformationsArea(guild, roleMap);
  await createCommunauteArea(guild, roleMap, ownerId);
  await createVocalArea(guild, ownerId);
  await createModerationArea(guild, roleMap, ownerId);
  await createConfigurationArea(guild, roleMap, ownerId);
  await provisionGuildGameStructures(guild);

  markGuildInstalled(guild.id, ownerId);
}

async function createSetupArea(guild) {
  try {
    const owner = await guild.fetchOwner();

    const category = await ensureCategory(guild, CATEGORIES.setup, [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: owner.id, allow: [PermissionFlagsBits.ViewChannel] }
    ]);

    const channel = await ensureTextChannel(guild, category.id, CHANNELS.setup, [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: owner.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]);

    await runSetupInstallationPhases(guild, owner.id);

    const language = resolveSetupLanguage(guild.id);
    await channel.send(buildSetupInstallMessagePayloadForGuild(language));
    return { category, channel };
  } catch (error) {
    logger.error('Failed to create setup area', error);
    throw error;
  }
}

async function handleSetupLanguageSelection(interaction) {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEphemeral(interaction, t(interaction.guildId, 'setup.inGuildOnly'));
    return;
  }

  const isOwner = interaction.user.id === interaction.guild.ownerId;
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  if (!isOwner && !isAdmin) {
    await replyEphemeral(interaction, t(interaction.guildId, 'setup.adminOnlyLanguage'));
    return;
  }

  const selectedLanguage = setGuildLanguage(interaction.guild.id, interaction.values?.[0]);

  await interaction.update(buildSetupInstallMessagePayloadForGuild(selectedLanguage));
}

async function handleSetupInstallButton(interaction) {
  if (!interaction.inGuild() || !interaction.guild) {
    await replyEphemeral(interaction, t(interaction.guildId, 'setup.inGuildOnly'));
    return;
  }

  const isOwner = interaction.user.id === interaction.guild.ownerId;
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  if (!isOwner && !isAdmin) {
    await replyEphemeral(interaction, t(interaction.guildId, 'setup.adminOnlyInstall'));
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const owner = await interaction.guild.fetchOwner();
    await runSetupInstallationPhases(interaction.guild, owner.id);
    await interaction.editReply(t(interaction.guildId, 'setup.installSuccess'));
  } catch (error) {
    logger.error('Failed setup install button execution', error);
    await interaction.editReply(t(interaction.guildId, 'setup.installError'));
  }
}

function finalizeInstall(guild) {
  markGuildInstalled(guild.id, guild.ownerId);
}

module.exports = {
  SETUP_INSTALL_BUTTON_ID,
  SETUP_LANGUAGE_SELECT_ID,
  createSetupArea,
  ensureSetupInstallPrompt,
  finalizeInstall,
  handleSetupLanguageSelection,
  handleSetupInstallButton
};
