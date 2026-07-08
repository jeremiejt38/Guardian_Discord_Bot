const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { CATEGORIES } = require('../../config');
const { getGuildSetting } = require('../config/settings');
const { findCategoryByName } = require('../utils/channels');
const logger = require('../logs/logger');

const READ_ONLY_PERMS = [
  {
    id: null,
    allow: [PermissionFlagsBits.ViewChannel],
    deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads]
  }
];

const GUIDE_DEFINITIONS = [
  {
    key: 'getting-started',
    name: 'guide-demarrage',
    emoji: '🚀',
    title: 'Getting Started',
    buildContent: (guild, guildId) => {
      const delay = getGuildSetting(guildId, 'members', 'promotion_delay_hours', 48);
      return [
        '# 🚀 Getting Started on this server',
        '',
        '## Welcome!',
        `You\'ve just joined **${guild.name}**. Here\'s everything you need to know to get started.`,
        '',
        '## 📋 Step 1 — Read the rules',
        'Check out **#regles** and accept the rules to unlock access to more channels.',
        '',
        '## ⏱️ Step 2 — Be patient',
        `You need to spend at least **${delay} hours** on the server before you can apply for membership.`,
        '',
        '## 🚀 Step 3 — Become a member',
        'Head to **#devenir-membre** to check your prerequisites and submit your membership request.',
        '',
        '## 🎮 Step 4 — Join game channels',
        'Once you\'re a member, you can opt into game-specific channels in **#ma-gamelist**.',
        '',
        '-# *This guide is maintained automatically by Guardian.*'
      ].join('\n');
    }
  },
  {
    key: 'membership',
    name: 'guide-promotion',
    emoji: '🏅',
    title: 'Becoming a Member',
    buildContent: (guild, guildId) => {
      const delay = getGuildSetting(guildId, 'members', 'promotion_delay_hours', 48);
      const bioRequired = Boolean(getGuildSetting(guildId, 'members', 'bio_required', false));
      const sponsorshipRequired = Boolean(getGuildSetting(guildId, 'members', 'sponsorship_required', false));
      const rulesRequired = Boolean(getGuildSetting(guildId, 'members', 'rules_acceptance_required', true));

      const prereqs = [];
      if (rulesRequired) prereqs.push('✅ Accept the server rules in **#regles**');
      prereqs.push(`⏱️ Spend at least **${delay} hours** on the server`);
      if (bioRequired) prereqs.push('📝 Fill in your **presentation** (bio)');
      if (sponsorshipRequired) prereqs.push('🤝 Be sponsored by an existing Member');

      return [
        '# 🏅 Becoming a Member',
        '',
        '## What is the "Membre" rank?',
        'Members have full access to all community channels, can post suggestions, and participate in votes.',
        '',
        '## Prerequisites',
        prereqs.map((p) => `- ${p}`).join('\n'),
        '',
        '## How to apply',
        '1. Go to **#devenir-membre**',
        '2. Click **"I want to become a member"**',
        '3. Check that all prerequisites are met',
        '4. Submit your request — the staff will review it',
        '',
        '-# *This guide is maintained automatically by Guardian.*'
      ].join('\n');
    }
  },
  {
    key: 'sponsorship',
    name: 'guide-parrainage',
    emoji: '🤝',
    title: 'Sponsorship',
    buildContent: (guild, _guildId) => [
      '# 🤝 Sponsorship Guide',
      '',
      '## What is sponsorship?',
      'An existing Member can vouch for you before your membership request is reviewed.',
      'It shows the staff that someone in the community already trusts you.',
      '',
      '## How to get a sponsor',
      '- Ask an existing Member to run `/parrainer @you` on the server',
      '- Once done, your sponsorship will appear in your prerequisites in **#devenir-membre**',
      '',
      '## How to sponsor someone',
      '- Use the command `/parrainer @user` where `@user` is the invite you want to vouch for',
      '- You can only sponsor one person at a time',
      '- You take responsibility for the person you sponsor',
      '',
      '-# *This guide is maintained automatically by Guardian.*'
    ].join('\n')
  },
  {
    key: 'games',
    name: 'guide-jeux',
    emoji: '🎮',
    title: 'Game Channels',
    buildContent: (guild, _guildId) => [
      '# 🎮 Game Channels Guide',
      '',
      '## How does it work?',
      'The server has dedicated channels for specific games.',
      'You can choose which games you\'re interested in to show or hide their channels.',
      '',
      '## Opt in / Opt out',
      '1. Go to **#ma-gamelist**',
      '2. Select the games you want to follow',
      '3. The corresponding channels will appear in your sidebar automatically',
      '',
      '## Suggest a new game',
      'If a game is missing, you can request it using the button in **#ma-gamelist**.',
      'The staff will review the request.',
      '',
      '-# *This guide is maintained automatically by Guardian.*'
    ].join('\n')
  },
  {
    key: 'commands',
    name: 'guide-commandes',
    emoji: '⌨️',
    title: 'Guardian Commands',
    buildContent: (guild, _guildId) => [
      '# ⌨️ Guardian Commands',
      '',
      '## Member commands',
      '- `/parrainer @user` — Sponsor an invited user for membership',
      '- `/score` — View your behaviour score',
      '- `/profile` — View your server profile',
      '',
      '## Staff commands',
      '- `/promote @user` — Promote a member to the next rank',
      '- `/warn @user` — Issue a warning',
      '- `/kick @user` — Kick a member',
      '- `/ban @user` — Ban a member',
      '- `/historique @user` — View sanction history',
      '',
      '## Configuration',
      'All Guardian settings are managed through the **⚙️ Configuration** category channels.',
      'Only Managers and Owners have access.',
      '',
      '-# *This guide is maintained automatically by Guardian.*'
    ].join('\n')
  }
];

async function ensureGuideCategory(guild) {
  const existing = findCategoryByName(guild, CATEGORIES.guides);
  if (existing) return existing;
  return guild.channels.create({
    name: CATEGORIES.guides,
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.SendMessages]
      }
    ]
  });
}

async function seedGuideMessage(channel, content) {
  const messages = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const existing = messages?.find((m) => m.author.bot && m.content?.startsWith('#'));
  if (existing) {
    if (existing.content !== content) {
      await existing.edit(content).catch(() => {});
    }
    return existing;
  }
  return channel.send(content).catch(() => null);
}

async function createCommunityGuides(guild) {
  const guildId = guild.id;
  const category = await ensureGuideCategory(guild);
  const readOnlyPerms = READ_ONLY_PERMS.map((p) => ({ ...p, id: guild.roles.everyone.id }));

  const createdChannels = [];

  for (const def of GUIDE_DEFINITIONS) {
    let ch = guild.channels.cache.find(
      (c) => c.parentId === category.id && c.name === def.name && c.type === ChannelType.GuildText
    );
    if (!ch) {
      ch = await guild.channels.create({
        name: def.name,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: readOnlyPerms,
        topic: `${def.emoji} ${def.title} — Guardian Guide`
      }).catch((err) => {
        logger.warn(`serverGuides: failed to create #${def.name} — ${err.message}`);
        return null;
      });
    } else {
      await ch.permissionOverwrites.set(readOnlyPerms).catch(() => {});
    }

    if (ch) {
      const content = def.buildContent(guild, guildId);
      await seedGuideMessage(ch, content);
      createdChannels.push(ch);
    }
  }

  return createdChannels;
}

async function createForumGuides(guild) {
  const guildId = guild.id;
  const category = await ensureGuideCategory(guild);
  const readOnlyPerms = READ_ONLY_PERMS.map((p) => ({ ...p, id: guild.roles.everyone.id }));
  const isCommunity = guild.features?.includes('COMMUNITY') ?? false;

  if (!isCommunity) {
    const createdChannels = [];
    for (const def of GUIDE_DEFINITIONS) {
      let ch = guild.channels.cache.find(
        (c) => c.parentId === category.id && c.name === def.name && c.type === ChannelType.GuildText
      );
      if (!ch) {
        ch = await guild.channels.create({
          name: def.name,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: readOnlyPerms,
          topic: `${def.emoji} ${def.title} — Guardian Guide`
        }).catch((err) => {
          logger.warn(`serverGuides: failed to create #${def.name} — ${err.message}`);
          return null;
        });
      } else {
        await ch.permissionOverwrites.set(readOnlyPerms).catch(() => {});
      }
      if (ch) {
        const content = def.buildContent(guild, guildId);
        await seedGuideMessage(ch, content);
        createdChannels.push(ch);
      }
    }
    return createdChannels;
  }

  for (const def of GUIDE_DEFINITIONS) {
    let forum = guild.channels.cache.find(
      (c) => c.parentId === category.id && c.name === def.name && c.type === ChannelType.GuildForum
    );
    if (!forum) {
      forum = await guild.channels.create({
        name: def.name,
        type: ChannelType.GuildForum,
        parent: category.id,
        permissionOverwrites: readOnlyPerms,
        topic: `${def.emoji} ${def.title} — Guardian Guide`
      }).catch((err) => {
        logger.warn(`serverGuides: failed to create forum #${def.name} — ${err.message}`);
        return null;
      });
    } else {
      await forum.permissionOverwrites.set(readOnlyPerms).catch(() => {});
    }

    if (forum) {
      const threads = await forum.threads.fetchActive().catch(() => null);
      const existingThread = threads?.threads?.find((t) => t.name === def.title);
      if (!existingThread) {
        const content = def.buildContent(guild, guildId);
        await forum.threads.create({
          name: def.title,
          message: { content }
        }).catch((err) => logger.warn(`serverGuides: failed to create thread "${def.title}" — ${err.message}`));
      }
    }
  }
}

async function patchOnboardingDefaultChannels(guild, channelIds) {
  try {
    const current = await guild.fetchOnboarding().catch(() => null);
    if (!current) return false;

    const existing = current.defaultChannels?.map((c) => c.id) ?? [];
    const merged = [...new Set([...existing, ...channelIds])];

    await guild.client.rest.patch(`/guilds/${guild.id}/onboarding`, {
      body: { default_channel_ids: merged }
    });

    logger.info(`serverGuides: patched onboarding default_channel_ids for guild ${guild.id} — added ${channelIds.length} guide channels`);
    return true;
  } catch (err) {
    logger.warn(`serverGuides: patchOnboarding failed for guild ${guild.id} — ${err.message}`);
    return false;
  }
}

async function notifyOwnerToAddGuides(guild, channels) {
  const ownerId = getGuildSetting(guild.id, 'setup', 'owner_id', null) ?? guild.ownerId;
  const owner = await guild.client.users.fetch(ownerId).catch(() => null);
  if (!owner) return;

  const list = channels.map((c) => `- **#${c.name}** (<#${c.id}>)`).join('\n');

  await owner.send([
    `## 📚 Guardian — Guide channels created on **${guild.name}**`,
    '',
    'Guardian has created the following guide channels in the **📚 Guides** category:',
    list,
    '',
    '### Add them to the Server Guide',
    'To make these guides visible in the Discord Server Guide (sidebar):',
    '1. Go to **Server Settings → Community → Server Guide**',
    '2. Add each channel listed above as a resource',
    '',
    '-# *This message was sent because Guardian could not automatically configure the Server Guide (insufficient permissions or unsupported server type).*'
  ].join('\n')).catch(() => {});
}

async function seedGuidesChannels(guild) {
  const enabled = getGuildSetting(guild.id, 'guides', 'enabled', true);
  if (!enabled) return;

  const isCommunity = guild.features?.includes('COMMUNITY') ?? false;

  try {
    if (isCommunity) {
      const channels = await createCommunityGuides(guild);
      if (channels.length > 0) {
        const channelIds = channels.map((c) => c.id);
        const patched = await patchOnboardingDefaultChannels(guild, channelIds);
        if (!patched) {
          await notifyOwnerToAddGuides(guild, channels);
        }
      }
    } else {
      await createForumGuides(guild);
    }
  } catch (err) {
    logger.error(`seedGuidesChannels failed for guild ${guild.id}`, err);
  }
}

module.exports = { seedGuidesChannels, GUIDE_DEFINITIONS };
