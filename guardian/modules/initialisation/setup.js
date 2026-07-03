const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { CATEGORIES, CHANNELS } = require('../../config');
const { markGuildInstalled } = require('./checkInstall');
const logger = require('../logs/logger');

async function createSetupArea(guild) {
  try {
    const owner = await guild.fetchOwner();

    const category = await guild.channels.create({
      name: CATEGORIES.setup,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: owner.id, allow: [PermissionFlagsBits.ViewChannel] }
      ]
    });

    const channel = await guild.channels.create({
      name: CHANNELS.setup,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: owner.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });

    await channel.send('Bienvenue dans Guardian setup. Le wizard complet peut être branché ici module par module.');
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
