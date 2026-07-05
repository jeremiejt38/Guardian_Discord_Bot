const { EmbedBuilder } = require('discord.js');
const { CHANNELS } = require('../../config');
const { t } = require('../i18n');
const { findTextChannelByName } = require('../utils/channels');
const { version } = require('../../package.json');

const botStartTime = Date.now();

function formatUptime() {
  const ms = Date.now() - botStartTime;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}min`);
  return parts.join(' ');
}

const ACTIVE_MODULES = [
  'Initialisation',
  'Nouveaux Membres',
  'Gamelist & Opt-in',
  'Vocaux Temporaires',
  'Changelogs Steam',
  'Modération',
  'AutoMod',
  'Signalements',
  'Score Comportemental',
  'Surveillance Serveurs',
  'Slow Mode Panel',
  'Behavior Panel'
];

function buildEmbed(guild) {
  const guildId = guild.id;
  return new EmbedBuilder()
    .setTitle(t(guildId, 'config.statusBot.title'))
    .setColor(0x5865f2)
    .addFields(
      { name: t(guildId, 'config.statusBot.version'), value: `v${version}`, inline: true },
      { name: t(guildId, 'config.statusBot.uptime'), value: formatUptime(), inline: true },
      { name: t(guildId, 'config.statusBot.modules'), value: ACTIVE_MODULES.map((m) => `✅ ${m}`).join('\n') },
      { name: t(guildId, 'config.statusBot.lastUpdate'), value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    )
    .setTimestamp();
}

async function seedStatusBotPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.statutBot);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const existing = msgs?.find((m) => m.author.id === guild.client.user.id && m.embeds.length > 0);
  if (existing) {
    await existing.edit({ embeds: [buildEmbed(guild)] }).catch(() => undefined);
    return;
  }
  await channel.send({ embeds: [buildEmbed(guild)] }).catch(() => undefined);
}

async function refreshStatusBotPanel(guild) {
  await seedStatusBotPanel(guild);
}

module.exports = { seedStatusBotPanel, refreshStatusBotPanel };
