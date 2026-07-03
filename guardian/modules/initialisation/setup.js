const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { CHANNEL_NAMES } = require('../../config');
const { setGuildSetting } = require('../config/settings');
const { markGuildInstalled } = require('./checkInstall');
const { CUSTOM_IDS } = require('./setupFlow');
const { provisionGuildStructure } = require('./provision');
const { applyGuardianPermissions } = require('./permissions');
const { t } = require('../../locales');
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
      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.start)
          .setStyle(ButtonStyle.Primary)
          .setLabel(t('setup.start', {}, { guildId: guild.id }))
      );

      await channel.send({
        content: t('setup.intro', {}, { guildId: guild.id }).join('\n'),
        components: [controls]
      });
    }

    return { category, channel };
  } catch (error) {
    logger.error('Failed to create setup area', error);
    throw error;
  }
}

async function finalizeInstall(guild) {
  await provisionGuildStructure(guild);
  await applyGuardianPermissions(guild);
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
