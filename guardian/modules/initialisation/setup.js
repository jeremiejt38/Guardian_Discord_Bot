const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../../database/db');
const { CATEGORIES, CHANNELS, GRADE_NAMES } = require('../../config');
const { getGuildSetting } = require('../config/settings');
const { markGuildInstalled } = require('./checkInstall');
const logger = require('../logs/logger');

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
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === name
  );

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
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === name && channel.parentId === parentId
  );

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
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildVoice && channel.name === name && channel.parentId === parentId
  );

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

  const defaultMessages = [
    'FAQ Guardian: utilise le channel setup pour initialiser les modules serveur.',
    'FAQ Guardian: les roles Invité/Membre/Modérateur/Manager/Owner pilotent les permissions.',
    'FAQ Guardian: pour support, ouvre une demande dans #demandes.'
  ];

  for (const message of defaultMessages) {
    await channel.send(message);
  }
}

async function seedVoiceCreateMessage(channel) {
  if (channel.lastMessageId) {
    return;
  }

  await channel.send('Guardian Vocal: rejoins ce salon texte pour creer ton channel vocal temporaire.');
}

async function seedGuardianConfigMessage(channel) {
  if (channel.lastMessageId) {
    return;
  }

  await channel.send(`Guardian Configuration: ce salon #${channel.name} est pret et configure.`);
}

async function seedServerManagementPlaceholder(channel) {
  if (channel.lastMessageId) {
    return;
  }

  await channel.send('Guardian Placeholder: ce salon est reserve au futur bot Pterodactyl pour la gestion serveurs.');
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
    {
      name: CHANNELS.gameChannels,
      permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.membre)
    },
    {
      name: CHANNELS.gameList,
      permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.membre)
    },
    {
      name: CHANNELS.serverList,
      permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.moderateur)
    },
    {
      name: CHANNELS.configLogs,
      permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.owner)
    },
    {
      name: CHANNELS.guardian,
      permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.owner)
    },
    {
      name: CHANNELS.behavior,
      permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.owner)
    },
    {
      name: CHANNELS.autoModeration,
      permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.owner)
    },
    {
      name: CHANNELS.roles,
      permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.owner)
    },
    {
      name: CHANNELS.serverManagement,
      permissions: buildConfigPermissions(guild, roleMap, ownerId, GRADE_NAMES.owner)
    }
  ];

  for (const item of channels) {
    const channel = await ensureTextChannel(guild, configurationCategory.id, item.name, item.permissions);
    if (item.name === CHANNELS.serverManagement) {
      await seedServerManagementPlaceholder(channel);
    } else {
      await seedGuardianConfigMessage(channel);
    }
  }
}

async function createSetupArea(guild) {
  try {
    const owner = await guild.fetchOwner();
    const roleMap = getGradeRoleMap(guild.id);

    const category = await ensureCategory(guild, CATEGORIES.setup, [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: owner.id, allow: [PermissionFlagsBits.ViewChannel] }
    ]);

    const channel = await ensureTextChannel(guild, category.id, CHANNELS.setup, [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: owner.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]);

    await createInformationsArea(guild, roleMap);
    await createCommunauteArea(guild, roleMap, owner.id);
    await createVocalArea(guild, owner.id);
    await createModerationArea(guild, roleMap, owner.id);
    await createConfigurationArea(guild, roleMap, owner.id);

    await channel.send('Bienvenue dans Guardian setup. Le wizard complet peut être branché ici module par module.');
    finalizeInstall(guild);
    return { category, channel };
  } catch (error) {
    logger.error('Failed to create setup area', error);
    throw error;
  }
}

function finalizeInstall(guild) {
  markGuildInstalled(guild.id, guild.ownerId);
}

module.exports = {
  createSetupArea,
  finalizeInstall
};
