const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { CHANNELS, GRADE_NAMES } = require('../../config');
const { t } = require('../i18n');
const { replyEphemeral } = require('../utils/interactions');
const { findTextChannelByName } = require('../utils/channels');
const { getGuildSetting } = require('./settings');
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { getDb } = require('../../database/db');
const { logConfigChange } = require('./configLogger');

const IDS = Object.freeze({
  refreshPanels: 'guardian:refresh:panels',
  syncMembers: 'guardian:sync:members'
});

function hasOwnerGrade(member, guildId) {
  const mappings = getGradeMappings(guildId);
  const ownerRoleId = mappings[GRADE_NAMES.owner];
  return ownerRoleId && member.roles.cache.has(ownerRoleId);
}

function buildPanelContent(guild, guildId) {
  const db = getDb();
  const memberCount = db.prepare('SELECT COUNT(*) as n FROM members WHERE guild_id = ?').get(guildId)?.n ?? 0;
  const gameCount = db.prepare('SELECT COUNT(*) as n FROM games WHERE guild_id = ?').get(guildId)?.n ?? 0;
  const setupDone = getGuildSetting(guildId, 'setup', 'step', 0);
  const lang = getGuildSetting(guildId, 'bot', 'language', 'fr') || 'fr';
  const steamKey = getGuildSetting(guildId, 'bot', 'steam_api_key', null);

  return [
    `**${t(guildId, 'config.guardian.title')}**\n`,
    `• **${t(guildId, 'config.guardian.members')}** : ${memberCount}`,
    `• **${t(guildId, 'config.guardian.games')}** : ${gameCount}`,
    `• **${t(guildId, 'config.guardian.setupStep')}** : étape ${setupDone}/8`,
    `• **${t(guildId, 'config.guardian.language')}** : \`${lang}\``,
    `• **${t(guildId, 'config.guardian.steamKey')}** : ${steamKey ? '✅' : '❌'}`,
    `\n${t(guildId, 'config.guardian.hint')}`
  ].join('\n');
}

function buildRows(guildId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(IDS.refreshPanels)
        .setLabel(t(guildId, 'config.guardian.refreshPanels'))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(IDS.syncMembers)
        .setLabel(t(guildId, 'config.guardian.syncMembers'))
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function seedGuardianPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.guardian);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const hasPanel = msgs?.some((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (hasPanel) {
    const panel = msgs.find((m) => m.author.id === guild.client.user.id && m.components.length > 0);
    await panel.edit({ content: buildPanelContent(guild, guild.id), components: buildRows(guild.id) }).catch(() => undefined);
    return;
  }
  await channel.send({ content: buildPanelContent(guild, guild.id), components: buildRows(guild.id) }).catch(() => undefined);
}

async function handleGuardianInteraction(interaction) {
  const { customId, guildId } = interaction;
  if (!customId?.startsWith('guardian:')) return false;

  if (!hasOwnerGrade(interaction.member, guildId)) {
    await replyEphemeral(interaction, t(guildId, 'config.ownerOnly'));
    return true;
  }

  if (interaction.isButton() && customId === IDS.refreshPanels) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const { seedGuildMessages } = require('../../modules/initialisation/seeds');
    await seedGuildMessages(interaction.guild);
    await seedGuardianPanel(interaction.guild);
    await interaction.editReply({ content: t(guildId, 'config.guardian.panelsRefreshed') }).catch(() => {});
    await logConfigChange(interaction.guild, interaction.user.id, 'guardian.refresh_panels', null, 'triggered');
    return true;
  }

  if (interaction.isButton() && customId === IDS.syncMembers) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const db = getDb();
    const mappings = getGradeMappings(guildId);
    const invertedMap = {};
    for (const [gradeName, roleId] of Object.entries(mappings)) {
      if (roleId) invertedMap[roleId] = gradeName;
    }
    const members = await interaction.guild.members.fetch().catch(() => null);
    if (!members) {
      await interaction.editReply({ content: t(guildId, 'config.guardian.syncFailed') }).catch(() => {});
      return true;
    }
    const insert = db.prepare(
      `INSERT OR IGNORE INTO members (guild_id, user_id, grade, join_date, score_comportement) VALUES (?, ?, ?, ?, ?)`
    );
    let count = 0;
    for (const member of members.values()) {
      if (member.user.bot) continue;
      let grade = GRADE_NAMES.invite;
      for (const [roleId, gradeName] of Object.entries(invertedMap)) {
        if (member.roles.cache.has(roleId)) { grade = gradeName; break; }
      }
      const result = insert.run(guildId, member.id, grade, member.joinedAt?.toISOString() || new Date().toISOString(), 200);
      if (result.changes > 0) count++;
    }
    await seedGuardianPanel(interaction.guild);
    await interaction.editReply({ content: t(guildId, 'config.guardian.syncDone', { count }) }).catch(() => {});
    await logConfigChange(interaction.guild, interaction.user.id, 'guardian.sync_members', null, `${count} inserts`);
    return true;
  }

  return false;
}

module.exports = { seedGuardianPanel, handleGuardianInteraction };
