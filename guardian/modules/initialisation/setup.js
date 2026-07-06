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
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const {
  getAvailableLanguages,
  getLanguageLabel,
  getGuildLanguage,
  setGuildLanguage,
  t,
  tForLanguage
} = require('../i18n');
const { markGuildInstalled } = require('./checkInstall');
const { getInstallContext, autoMapRolesByName } = require('./detectInstallContext');
const { provisionGuildGameStructures, buildOpenButtonRow } = require('../games/gameList');
const {
  findCategoryByName,
  findGuildTextChannelByName,
  findGuildVoiceChannelByName,
  findGuildForumChannelByName
} = require('../utils/channels');
const { replyEphemeral } = require('../utils/interactions');
const { getGradeMappings } = require('./gradeMapping');
const logger = require('../logs/logger');

const SETUP_INSTALL_BUTTON_ID = 'setup:install';
const SETUP_LANGUAGE_SELECT_ID = 'setup:language';
const SETUP_START_BUTTON_ID = 'setup:start';
const SETUP_INTEGRATE_BUTTON_ID = 'setup:integrate';
const SETUP_RESET_BUTTON_ID = 'setup:reset';
const SETUP_FORCE_EXISTING_BUTTON_ID = 'setup:force-existing';
const SETUP_FORCE_REINSTALL_BUTTON_ID = 'setup:force-reinstall';

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

async function ensureForumChannel(guild, parentId, name, permissionOverwrites) {
  const existingForum = findGuildForumChannelByName(guild, name, parentId);
  if (existingForum) {
    await existingForum.edit({ parent: parentId, permissionOverwrites });
    return existingForum;
  }

  // A same-named text channel from a previous install cannot be converted to a
  // forum; keep it as-is so we do not destroy existing content.
  const existingText = findGuildTextChannelByName(guild, name, parentId);
  if (existingText) {
    await existingText.edit({ parent: parentId, permissionOverwrites });
    return existingText;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildForum,
    parent: parentId,
    permissionOverwrites
  });
}

async function ensureForumPost(channel, name, content) {
  if (channel?.type !== ChannelType.GuildForum || typeof channel.threads?.create !== 'function') {
    return;
  }

  const existing = await channel.threads.fetchActive().catch(() => null);
  if (existing?.threads?.size) {
    return;
  }

  await channel.threads.create({ name, message: { content } });
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
  const language = getGuildLanguage(channel.guild.id);
  const defaultMessages = [
    tForLanguage(language, 'init.faq1'),
    tForLanguage(language, 'init.faq2'),
    tForLanguage(language, 'init.faq3')
  ];

  if (channel.type === ChannelType.GuildForum) {
    const existing = await channel.threads.fetchActive().catch(() => null);
    if (existing?.threads?.size) {
      return;
    }

    let index = 1;
    for (const message of defaultMessages) {
      await channel.threads.create({
        name: tForLanguage(language, 'init.faqPostTitle', { index }),
        message: { content: message }
      });
      index += 1;
    }
    return;
  }

  if (channel.lastMessageId) {
    return;
  }

  for (const message of defaultMessages) {
    await channel.send(message);
  }
}

async function seedStaticInfoMessage(channel, key) {
  if (!channel?.isTextBased?.() || channel.lastMessageId) {
    return;
  }

  await channel.send(tForLanguage(getGuildLanguage(channel.guild.id), key));
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

  const readOnlyPermissions = [
    {
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [PermissionFlagsBits.SendMessages]
    }
  ];

  const welcomeChannel = await ensureTextChannel(guild, informationsCategory.id, CHANNELS.welcome, readOnlyPermissions);
  const rulesChannel = await ensureTextChannel(guild, informationsCategory.id, CHANNELS.rules, readOnlyPermissions);
  const announcementsChannel = await ensureTextChannel(guild, informationsCategory.id, CHANNELS.annonces, readOnlyPermissions);
  const faqChannel = await ensureForumChannel(guild, informationsCategory.id, CHANNELS.faq, readOnlyPermissions);

  await ensureTextChannel(guild, informationsCategory.id, CHANNELS.requests, buildRequestsPermissions(guild, roleMap));

  await seedStaticInfoMessage(welcomeChannel, 'init.welcomeInfo');
  await seedStaticInfoMessage(rulesChannel, 'init.rules');
  await seedStaticInfoMessage(announcementsChannel, 'init.announcements');
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

  await ensureTextChannel(guild, communauteCategory.id, CHANNELS.requests, buildRequestsPermissions(guild, roleMap));

  const memberReadPermissions = [
    { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }
  ];
  await ensureTextChannel(guild, communauteCategory.id, CHANNELS.serverList, memberReadPermissions);

  const suggestionsEnabled = getGuildSetting(guild.id, 'channels', 'suggestions_enabled', true);
  if (suggestionsEnabled) {
    const suggestionsForum = await ensureForumChannel(guild, communauteCategory.id, CHANNELS.suggestions, [
      { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel] }
    ]);
    await ensureForumPost(
      suggestionsForum,
      tForLanguage(getGuildLanguage(guild.id), 'init.suggestionsPostTitle'),
      tForLanguage(getGuildLanguage(guild.id), 'init.suggestionsIntro')
    );
  }
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

    // servers management (moderateur+)
    { name: CHANNELS.serveurs, permissions: buildViewThenActionPermissions(guild, roleMap, ownerId, GRADE_NAMES.moderateur, GRADE_NAMES.manager) },

    // bot & status (manager+)
    { name: CHANNELS.botConfig, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },

    // admin configuration channels
    { name: CHANNELS.membres, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.channelsConfig, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.vocauxConfig, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },
    { name: CHANNELS.jeux, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },

    // logs and guardian config
    { name: CHANNELS.configLogs, permissions: buildViewOnlyPermissions(guild, roleMap, ownerId, GRADE_NAMES.manager) },

    // owner only
    { name: CHANNELS.roles, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.owner) },
    { name: CHANNELS.guardian, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.owner) },

    // legacy management channel (future Pterodactyl control)
    { name: CHANNELS.serverManagement, permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.owner) }
  ];

  for (const item of channels) {
    const channel = await ensureTextChannel(guild, configurationCategory.id, item.name, item.permissions);
    if (item.name === CHANNELS.serverManagement) {
      await seedServerManagementPlaceholder(channel);
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
      .setLabel(tForLanguage(language, 'setup.continueButton'))
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

async function purgeSetupChannel(setupChannel) {
  try {
    let fetched;
    do {
      fetched = await setupChannel.messages.fetch({ limit: 100 });
      if (fetched.size === 0) break;
      const deletable = fetched.filter((m) => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
      const old = fetched.filter((m) => Date.now() - m.createdTimestamp >= 14 * 24 * 60 * 60 * 1000);
      if (deletable.size > 1) {
        await setupChannel.bulkDelete(deletable);
      } else if (deletable.size === 1) {
        await deletable.first().delete();
      }
      for (const msg of old.values()) {
        await msg.delete().catch(() => {});
      }
    } while (fetched.size >= 100);
  } catch (err) {
    logger.error('Failed to purge setup channel', err);
  }
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

  await purgeSetupChannel(setupChannel);

  const language = resolveSetupLanguage(guild.id);
  await setupChannel.send(buildSetupInstallMessagePayloadForGuild(language));
}

function buildSetupInstallMessagePayloadForGuild(language) {
  return {
    content: getSetupMessageContent(language),
    components: [buildSetupLanguageSelectRow(language), buildSetupInstallButtonRow(language)]
  };
}

async function repositionCategories(guild) {
  const order = [
    CATEGORIES.informations,
    CATEGORIES.communaute,
    CATEGORIES.vocaux,
  ];
  const fixedEnd = [
    CATEGORIES.moderation,
    CATEGORIES.configuration
  ];

  const allCategories = guild.channels.cache.filter((c) => c.type === 4);
  const gameCats = allCategories.filter(
    (c) => !order.includes(c.name) && !fixedEnd.includes(c.name) && c.name !== CATEGORIES.setup
  ).sort((a, b) => a.name.localeCompare(b.name));

  const ordered = [
    ...order.map((name) => allCategories.find((c) => c.name === name)).filter(Boolean),
    ...gameCats.values(),
    ...fixedEnd.map((name) => allCategories.find((c) => c.name === name)).filter(Boolean)
  ];

  for (let i = 0; i < ordered.length; i++) {
    await ordered[i].setPosition(i).catch(() => {});
  }
}

async function runSetupInstallationPhases(guild, ownerId) {
  const roleMap = getGradeMappings(guild.id);

  await createInformationsArea(guild, roleMap);
  await createCommunauteArea(guild, roleMap, ownerId);
  await createVocalArea(guild, ownerId);
  await provisionGuildGameStructures(guild);
  await createModerationArea(guild, roleMap, ownerId);
  await createConfigurationArea(guild, roleMap, ownerId);
  await repositionCategories(guild);

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

    setGuildSetting(guild.id, 'setup', 'owner_id', owner.id);
    if (!Number.isInteger(getGuildSetting(guild.id, 'setup', 'step', null))) {
      setGuildSetting(guild.id, 'setup', 'step', 1);
    }

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

function buildContextChoiceMessage(guildId, context) {
  const messages = {
    reinstall: [
      `⚠️ **${t(guildId, 'setup.contextReinstallTitle')}**`,
      t(guildId, 'setup.contextReinstallDesc'),
      '',
      `> ${t(guildId, 'setup.contextReinstallOption1')}`,
      `> ${t(guildId, 'setup.contextReinstallOption2')}`
    ],
    existing_server: [
      `ℹ️ **${t(guildId, 'setup.contextExistingTitle')}**`,
      t(guildId, 'setup.contextExistingDesc'),
      '',
      `> ${t(guildId, 'setup.contextExistingOption1')}`,
      `> ${t(guildId, 'setup.contextExistingOption2')}`
    ]
  };
  return messages[context]?.join('\n') ?? '';
}

function buildFreshRow(guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(SETUP_START_BUTTON_ID)
      .setLabel(t(guildId, 'setup.freshInstallButton'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(SETUP_FORCE_EXISTING_BUTTON_ID)
      .setLabel(t(guildId, 'setup.freshForceExistingButton'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(SETUP_FORCE_REINSTALL_BUTTON_ID)
      .setLabel(t(guildId, 'setup.freshForceReinstallButton'))
      .setStyle(ButtonStyle.Secondary)
  );
}


function buildPartialRow(guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(SETUP_START_BUTTON_ID)
      .setLabel(t(guildId, 'setup.resumeInstallButton'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(SETUP_RESET_BUTTON_ID)
      .setLabel(t(guildId, 'setup.contextResetButton'))
      .setStyle(ButtonStyle.Danger)
  );
}

function buildContextChoiceRow(guildId, context) {
  if (context === 'reinstall') {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(SETUP_INTEGRATE_BUTTON_ID)
        .setLabel(t(guildId, 'setup.contextKeepButton'))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(SETUP_RESET_BUTTON_ID)
        .setLabel(t(guildId, 'setup.contextResetButton'))
        .setStyle(ButtonStyle.Danger)
    );
  }
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(SETUP_INTEGRATE_BUTTON_ID)
      .setLabel(t(guildId, 'setup.contextIntegrateButton'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(SETUP_RESET_BUTTON_ID)
      .setLabel(t(guildId, 'setup.contextFreshButton'))
      .setStyle(ButtonStyle.Secondary)
  );
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

  const guildId = interaction.guildId;
  const context = getInstallContext(interaction.guild);

  if (context === 'fresh') {
    await interaction.message.edit({
      content: [
        `✅ **${t(guildId, 'setup.freshTitle')}**`,
        t(guildId, 'setup.freshDesc')
      ].join('\n'),
      components: [buildFreshRow(guildId)]
    });
    await interaction.deferUpdate().catch(() => {});
    return;
  }

  if (context === 'guardian_partial') {
    await interaction.message.edit({
      content: [
        `⏸️ **${t(guildId, 'setup.guardianPartialTitle')}**`,
        t(guildId, 'setup.guardianPartialDesc')
      ].join('\n'),
      components: [buildPartialRow(guildId)]
    });
    await interaction.deferUpdate().catch(() => {});
    return;
  }

  await interaction.message.edit({
    content: buildContextChoiceMessage(guildId, context),
    components: [buildContextChoiceRow(guildId, context)]
  });
  await interaction.deferUpdate().catch(() => {});
}

async function handleSetupIntegrateButton(interaction) {
  if (!interaction.inGuild() || !interaction.guild) return;
  const guildId = interaction.guildId;
  try {
    const context = getInstallContext(interaction.guild);
    if (context === 'reinstall') {
      await interaction.deferUpdate().catch(() => {});
      await completeGuildSetup(interaction.guild);
      return;
    }
    autoMapRolesByName(interaction.guild);
    const { startWizardInChannel } = require('./setupFlow');
    await startWizardInChannel(interaction);
  } catch (error) {
    logger.error('Failed setup integrate', error);
    if (interaction.isRepliable()) await replyEphemeral(interaction, t(guildId, 'setup.installError'));
  }
}

async function handleSetupResetButton(interaction) {
  if (!interaction.inGuild() || !interaction.guild) return;
  const guildId = interaction.guildId;
  try {
    const db = getDb();
    db.prepare('DELETE FROM guild_config WHERE guild_id = ?').run(guildId);
    db.prepare('DELETE FROM grades WHERE guild_id = ?').run(guildId);
    db.prepare('UPDATE guilds SET setup_done = 0 WHERE guild_id = ?').run(guildId);
    setGuildSetting(guildId, 'setup', 'fresh_install', true);

    const { startWizardInChannel } = require('./setupFlow');
    await startWizardInChannel(interaction);
  } catch (error) {
    logger.error('Failed setup reset', error);
    if (interaction.isRepliable()) await replyEphemeral(interaction, t(guildId, 'setup.installError'));
  }
}

function finalizeInstall(guild) {
  markGuildInstalled(guild.id, guild.ownerId);
}

async function cleanupSetupArea(guild) {
  const setupCategory = findCategoryByName(guild, CATEGORIES.setup);
  if (!setupCategory) {
    return;
  }

  const children = guild.channels.cache.filter((channel) => channel.parentId === setupCategory.id);
  for (const child of children.values()) {
    await child.delete('Guardian setup finalised').catch((error) => {
      logger.error('Failed to remove setup child channel', error);
    });
  }

  await setupCategory.delete('Guardian setup finalised').catch((error) => {
    logger.error('Failed to remove setup category', error);
  });
}

async function postSetupSummary(guild) {
  const welcomeChannel = findGuildTextChannelByName(guild, CHANNELS.welcome);
  if (!welcomeChannel?.isTextBased?.()) {
    return;
  }

  const language = getGuildLanguage(guild.id);
  const delayHours = Number(getGuildSetting(guild.id, 'members', 'promotion_delay_hours', 48));

  await welcomeChannel.send(
    tForLanguage(language, 'setup.summary', {
      guild: guild.name,
      delay: delayHours
    })
  );
}

async function seedExistingMembers(guild) {
  const db = getDb();
  const roleMap = getGradeMappings(guild.id);
  const invertedMap = {};
  for (const [gradeName, roleId] of Object.entries(roleMap)) {
    if (roleId) invertedMap[roleId] = gradeName;
  }

  const members = await guild.members.fetch().catch(() => null);
  if (!members) return;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO members (guild_id, user_id, grade, join_date, score_comportement)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const member of members.values()) {
    if (member.user.bot) continue;
    let grade = GRADE_NAMES.invite;
    for (const [roleId, gradeName] of Object.entries(invertedMap)) {
      if (member.roles.cache.has(roleId)) {
        grade = gradeName;
        break;
      }
    }
    insert.run(
      guild.id,
      member.id,
      grade,
      member.joinedAt?.toISOString() || new Date().toISOString(),
      200
    );
  }
}

async function completeGuildSetup(guild) {
  const owner = await guild.fetchOwner();
  await runSetupInstallationPhases(guild, owner.id);
  await seedExistingMembers(guild);
  await postSetupSummary(guild);
  await cleanupSetupArea(guild);
}

async function handleSetupForceExistingButton(interaction) {
  if (!interaction.inGuild() || !interaction.guild) return;
  const guildId = interaction.guildId;
  await interaction.message.edit({
    content: buildContextChoiceMessage(guildId, 'existing_server'),
    components: [buildContextChoiceRow(guildId, 'existing_server')]
  });
  await interaction.deferUpdate().catch(() => {});
}

async function handleSetupForceReinstallButton(interaction) {
  if (!interaction.inGuild() || !interaction.guild) return;
  const guildId = interaction.guildId;
  await interaction.message.edit({
    content: buildContextChoiceMessage(guildId, 'reinstall'),
    components: [buildContextChoiceRow(guildId, 'reinstall')]
  });
  await interaction.deferUpdate().catch(() => {});
}

module.exports = {
  SETUP_INSTALL_BUTTON_ID,
  SETUP_LANGUAGE_SELECT_ID,
  SETUP_START_BUTTON_ID,
  SETUP_INTEGRATE_BUTTON_ID,
  SETUP_RESET_BUTTON_ID,
  SETUP_FORCE_EXISTING_BUTTON_ID,
  SETUP_FORCE_REINSTALL_BUTTON_ID,
  createSetupArea,
  ensureSetupInstallPrompt,
  finalizeInstall,
  completeGuildSetup,
  handleSetupLanguageSelection,
  handleSetupInstallButton,
  handleSetupIntegrateButton,
  handleSetupResetButton,
  handleSetupForceExistingButton,
  handleSetupForceReinstallButton
};
