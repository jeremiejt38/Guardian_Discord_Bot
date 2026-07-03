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
