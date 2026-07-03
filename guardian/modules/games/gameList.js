const { getDb } = require('../../database/db');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { GRADE_NAMES } = require('../../config');
const logger = require('../logs/logger');

function toChannelSlug(name) {
  return String(name || 'jeu')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function getModerationRoleIds(guildId) {
  const db = getDb();
  const rows = db
    .prepare('SELECT role_id FROM grades WHERE guild_id = ? AND grade_name IN (?, ?, ?)')
    .all(guildId, GRADE_NAMES.moderateur, GRADE_NAMES.manager, GRADE_NAMES.owner);

  return rows.map((row) => row.role_id).filter(Boolean);
}

async function ensureGameRole(guild, game) {
  if (game.role_id) {
    const role = guild.roles.cache.get(game.role_id);
    if (role) {
      return role;
    }
  }

  const existingByName = guild.roles.cache.find((role) => role.name === game.name);
  if (existingByName) {
    return existingByName;
  }

  return guild.roles.create({
    name: game.name,
    mentionable: true,
    reason: `Guardian game opt-in role for ${game.name}`
  });
}

async function ensureCategory(guild, gameName, permissionOverwrites, existingId) {
  const existingById = existingId ? guild.channels.cache.get(existingId) : null;
  if (existingById?.type === ChannelType.GuildCategory) {
    await existingById.edit({ permissionOverwrites });
    return existingById;
  }

  const existingByName = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === gameName
  );
  if (existingByName) {
    await existingByName.edit({ permissionOverwrites });
    return existingByName;
  }

  return guild.channels.create({
    name: gameName,
    type: ChannelType.GuildCategory,
    permissionOverwrites
  });
}

async function ensureTextChannel(guild, parentId, channelName, permissionOverwrites, existingId) {
  const existingById = existingId ? guild.channels.cache.get(existingId) : null;
  if (existingById?.type === ChannelType.GuildText) {
    await existingById.edit({ parent: parentId, permissionOverwrites });
    return existingById;
  }

  const existingByName = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.parentId === parentId && channel.name === channelName
  );
  if (existingByName) {
    await existingByName.edit({ parent: parentId, permissionOverwrites });
    return existingByName;
  }

  return guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites
  });
}

function buildGamePermissions(guild, gameRoleId, moderationRoleIds) {
  const permissions = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];

  if (gameRoleId) {
    permissions.push({
      id: gameRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  for (const roleId of moderationRoleIds) {
    permissions.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  return permissions;
}

async function provisionGameStructure(guild, game) {
  const db = getDb();
  const moderationRoleIds = getModerationRoleIds(guild.id);
  const gameRole = await ensureGameRole(guild, game);
  const permissions = buildGamePermissions(guild, gameRole?.id, moderationRoleIds);
  const slug = toChannelSlug(game.name);

  const category = await ensureCategory(guild, game.name, permissions, game.category_id);
  const textChannel = await ensureTextChannel(guild, category.id, slug, permissions, game.channel_text_id);

  let galerieChannelId = game.channel_galerie_id || null;
  if (Number(game.galerie_enabled) === 1) {
    const galerieChannel = await ensureTextChannel(
      guild,
      category.id,
      `${slug}-galerie`,
      permissions,
      game.channel_galerie_id
    );
    galerieChannelId = galerieChannel.id;
  }

  let changelogChannelId = game.channel_changelog_id || null;
  if (Number(game.changelog_enabled) === 1) {
    const changelogChannel = await ensureTextChannel(
      guild,
      category.id,
      `${slug}-changelogs`,
      permissions,
      game.channel_changelog_id
    );
    changelogChannelId = changelogChannel.id;
  }

  db.prepare(
    `UPDATE games
     SET role_id = ?, category_id = ?, channel_text_id = ?, channel_galerie_id = ?, channel_changelog_id = ?
     WHERE guild_id = ? AND game_id = ?`
  ).run(
    gameRole?.id || null,
    category.id,
    textChannel.id,
    galerieChannelId,
    changelogChannelId,
    guild.id,
    game.game_id
  );
}

async function provisionGuildGameStructures(guild) {
  const db = getDb();
  const games = db
    .prepare(
      `SELECT game_id, guild_id, name, role_id, channel_text_id, channel_galerie_id, channel_changelog_id,
              category_id, galerie_enabled, changelog_enabled
       FROM games WHERE guild_id = ? ORDER BY game_id ASC`
    )
    .all(guild.id);

  for (const game of games) {
    try {
      await provisionGameStructure(guild, game);
    } catch (error) {
      logger.error(`Failed to provision game structure for ${game.name}`, error);
    }
  }
}

function getGuildGames(guildId) {
  const db = getDb();
  return db.prepare('SELECT game_id, name, role_id FROM games WHERE guild_id = ? ORDER BY name').all(guildId);
}

function getMemberGames(guildId, userId) {
  const db = getDb();
  return db.prepare('SELECT game_id FROM member_games WHERE guild_id = ? AND user_id = ?').all(guildId, userId);
}

function setMemberGames(guildId, userId, gameIds) {
  const db = getDb();
  const tx = db.transaction((ids) => {
    db.prepare('DELETE FROM member_games WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
    const insert = db.prepare('INSERT INTO member_games (guild_id, user_id, game_id) VALUES (?, ?, ?)');
    for (const gameId of ids) {
      insert.run(guildId, userId, gameId);
    }
  });

  tx(gameIds);
}

module.exports = {
  provisionGameStructure,
  provisionGuildGameStructures,
  getGuildGames,
  getMemberGames,
  setMemberGames
};
