const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { CHANNEL_NAMES } = require('../../config');
const { setGuildSetting } = require('../config/settings');
const { markGuildInstalled } = require('./checkInstall');
const logger = require('../logs/logger');

async function createSetupArea(guild) {
  try {
    const owner = await guild.fetchOwner();
    const existingCategory = guild.channels.cache.find(
      (channel) => channel.type === ChannelType.GuildCategory && channel.name === CHANNEL_NAMES.setupCategory
    );
    const existingChannel = guild.channels.cache.find(
      (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.name === CHANNEL_NAMES.setupChannel &&
      channel.parentId === existingCategory?.id
    );

    if (existingCategory && existingChannel) {
      return { category: existingCategory, channel: existingChannel };
    }

    const category =
      existingCategory ||
      (await guild.channels.create({
      name: CHANNEL_NAMES.setupCategory,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: owner.id, allow: [PermissionFlagsBits.ViewChannel] }
      ]
      }));

    const channel =
      existingChannel ||
      (await guild.channels.create({
      name: CHANNEL_NAMES.setupChannel,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: owner.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
      }));

    setGuildSetting(guild.id, 'setup', 'step', 1);
    setGuildSetting(guild.id, 'setup', 'owner_id', owner.id);

    if (!existingChannel) {
      await channel.send(
      [
        'Bienvenue dans Guardian setup.',
        'Étape 1/5: associer les grades Guardian aux rôles Discord.',
        'Étape 2/5: configurer les paramètres membres.',
        'Étape 3/5: définir les jeux du serveur.',
        'Étape 4/5: activer les modules optionnels.',
        'Étape 5/5: confirmer et installer.'
      ].join('\n')
      );
    }

    return { category, channel };
  } catch (error) {
    logger.error('Failed to create setup area', error);
    throw error;
  }
}

async function finalizeInstall(guild) {
  markGuildInstalled(guild.id, guild.ownerId);
  setGuildSetting(guild.id, 'setup', 'step', 5);

  const setupCategory = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === CHANNEL_NAMES.setupCategory
  );

  if (setupCategory) {
    for (const child of setupCategory.children.cache.values()) {
      await child.delete('Guardian setup finalized').catch(() => undefined);
    }
    await setupCategory.delete('Guardian setup finalized').catch(() => undefined);
  }
}

module.exports = {
  createSetupArea,
  finalizeInstall
};
