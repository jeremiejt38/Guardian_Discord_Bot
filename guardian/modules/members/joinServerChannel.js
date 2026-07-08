const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { CHANNELS } = require('../../config');
const { getDb } = require('../../database/db');
const { findChannelByName } = require('../utils/channels');
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const logger = require('../logs/logger');

const IDS = Object.freeze({
  customPresentation: 'joinserver:edit:presentation',
  customPresentationModal: 'joinserver:modal:presentation'
});

function getGuildStats(guild) {
  const db = getDb();
  const memberCount = guild.memberCount ?? 0;
  const createdAt = guild.createdAt;

  const gamesCount = (() => {
    try {
      return db.prepare('SELECT COUNT(*) as c FROM jeux WHERE guild_id = ?').get(guild.id)?.c ?? 0;
    } catch { return 0; }
  })();

  const serversCount = (() => {
    try {
      return db.prepare('SELECT COUNT(*) as c FROM servers_jeu WHERE guild_id = ? AND approved = 1').get(guild.id)?.c ?? 0;
    } catch { return 0; }
  })();

  return { memberCount, createdAt, gamesCount, serversCount };
}

function buildStatsEmbed(guild) {
  const { memberCount, createdAt, gamesCount, serversCount } = getGuildStats(guild);
  const created = createdAt ? `<t:${Math.floor(createdAt.getTime() / 1000)}:D>` : '—';

  const fields = [
    { name: '👥 Members', value: String(memberCount), inline: true },
    { name: '📅 Created', value: created, inline: true }
  ];
  if (gamesCount > 0) fields.push({ name: '🎮 Games', value: String(gamesCount), inline: true });
  if (serversCount > 0) fields.push({ name: '🖥️ Game servers', value: String(serversCount), inline: true });

  return new EmbedBuilder()
    .setTitle(`🏰 ${guild.name}`)
    .setDescription('Here is a quick overview of our community.')
    .addFields(fields)
    .setThumbnail(guild.iconURL() ?? null)
    .setColor(0x5865f2);
}

function buildGuardianFeaturesEmbed() {
  return new EmbedBuilder()
    .setTitle('🤖 What you unlock as a Member')
    .setDescription([
      '**🎮 Games** — subscribe to game channels, get Steam update notifications, join game-specific voice rooms',
      '**🔊 Temporary voice** — create a private voice room for your session, auto-deleted when you leave',
      '**🏆 Progression** — Invité → Membre → Modérateur → Manager → Owner grade system',
      '**💬 Community** — access #general, #suggestions, server list, and member-only channels',
      '**🛡️ Moderation** — transparent, logged, with behavior score that rewards good standing',
      '',
      '*All features are managed automatically by Guardian Bot.*'
    ].join('\n'))
    .setColor(0x57f287);
}

async function seedJoinServerChannel(channel, guild) {
  if (!channel?.isTextBased()) return;

  const existing = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  if (existing?.size > 0) {
    await channel.bulkDelete(existing).catch(() => {});
  }

  const customText = getGuildSetting(guild.id, 'joinserver', 'presentation', null);
  if (customText) {
    await channel.send({ content: customText }).catch(() => {});
  } else {
    await channel.send({
      content: [
        `## 🌟 Why join **${guild.name}** as a Member?`,
        '',
        '*This section is managed by the server owners. Ask a Manager or Owner to add their presentation here.*',
        '',
        '> Use the button below to set a custom presentation (Manager/Owner only).'
      ].join('\n'),
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(IDS.customPresentation)
            .setLabel('✏️ Edit presentation')
            .setStyle(ButtonStyle.Secondary)
        )
      ]
    }).catch(() => {});
  }

  await channel.send({ embeds: [buildStatsEmbed(guild)] }).catch(() => {});
  await channel.send({ embeds: [buildGuardianFeaturesEmbed()] }).catch(() => {});
}

async function refreshJoinServerStats(guild) {
  const channel = findChannelByName(guild, CHANNELS.joinServer);
  if (!channel?.isTextBased()) return;
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const statsMsg = messages.find((m) => m.author.bot && m.embeds?.[0]?.title?.startsWith('🏰'));
    if (statsMsg) {
      await statsMsg.edit({ embeds: [buildStatsEmbed(guild)] }).catch(() => {});
    }
  } catch (err) {
    logger.warn(`joinServerChannel: could not refresh stats for guild ${guild.id} — ${err.message}`);
  }
}

module.exports = { IDS, seedJoinServerChannel, refreshJoinServerStats, buildStatsEmbed };
