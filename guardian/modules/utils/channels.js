const { ChannelType } = require('discord.js');

function getChannelCache(guild) {
  return guild?.channels?.cache ?? null;
}

function findChannelByName(guild, name) {
  return getChannelCache(guild)?.find((channel) => channel.name === name) ?? null;
}

function findTextChannelByName(guild, name) {
  return getChannelCache(guild)?.find(
    (channel) => channel.name === name && channel.isTextBased?.()
  ) ?? null;
}

function findCategoryByName(guild, name) {
  return getChannelCache(guild)?.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === name
  ) ?? null;
}

function findGuildTextChannelByName(guild, name, parentId) {
  return getChannelCache(guild)?.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.name === name &&
      (parentId === undefined || channel.parentId === parentId)
  ) ?? null;
}

function findGuildVoiceChannelByName(guild, name, parentId) {
  return getChannelCache(guild)?.find(
    (channel) =>
      channel.type === ChannelType.GuildVoice &&
      channel.name === name &&
      (parentId === undefined || channel.parentId === parentId)
  ) ?? null;
}

function findGuildForumChannelByName(guild, name, parentId) {
  return getChannelCache(guild)?.find(
    (channel) =>
      channel.type === ChannelType.GuildForum &&
      channel.name === name &&
      (parentId === undefined || channel.parentId === parentId)
  ) ?? null;
}

async function resolveTextChannel(guild, preferredId, fallbackName, onFallback) {
  if (preferredId) {
    const byId = await guild.channels.fetch(preferredId).catch(() => null);
    if (byId?.isTextBased()) {
      return byId;
    }

    if (typeof onFallback === 'function') {
      onFallback();
    }
  }

  if (!fallbackName) {
    return null;
  }

  return findTextChannelByName(guild, fallbackName);
}

module.exports = {
  findChannelByName,
  findTextChannelByName,
  findCategoryByName,
  findGuildTextChannelByName,
  findGuildVoiceChannelByName,
  findGuildForumChannelByName,
  resolveTextChannel
};
