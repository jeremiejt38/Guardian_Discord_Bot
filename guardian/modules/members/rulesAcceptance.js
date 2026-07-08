const { getDb } = require('../../database/db');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildSetting } = require('../config/settings');
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { replyEphemeral } = require('../utils/interactions');
const { GRADE_NAMES } = require('../../config');
const logger = require('../logs/logger');

const IDS = Object.freeze({
  acceptRules: 'rules:accept'
});

function isCommunityGuild(guild) {
  return guild.features?.includes('COMMUNITY') ?? false;
}

function getRulesRequired(guildId) {
  return Boolean(getGuildSetting(guildId, 'members', 'rules_acceptance_required', true));
}

function hasAcceptedRules(guildId, userId) {
  const db = getDb();
  const row = db.prepare('SELECT rules_accepted FROM members WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  return Boolean(row?.rules_accepted);
}

function markRulesAccepted(guildId, userId) {
  const db = getDb();
  db.prepare(
    `INSERT INTO members (guild_id, user_id, grade, join_date, rules_accepted)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(guild_id, user_id)
     DO UPDATE SET rules_accepted = 1`
  ).run(guildId, userId, GRADE_NAMES.invite, new Date().toISOString());
}

async function seedRulesAcceptButton(channel, guild) {
  if (!channel?.isTextBased()) return;
  if (isCommunityGuild(guild)) return;

  const existing = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const hasButton = existing?.some((m) => m.author.bot && m.components?.length > 0);
  if (hasButton) return;

  await channel.send({
    content: [
      '## 📋 Règlement du serveur',
      '',
      'En cliquant sur le bouton ci-dessous, tu confirmes avoir lu et accepté le règlement du serveur.',
      '-# *Ton acceptation est requise pour pouvoir faire une demande de membre.*'
    ].join('\n'),
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(IDS.acceptRules)
          .setLabel('✅ J\'ai lu et j\'accepte le règlement')
          .setStyle(ButtonStyle.Success)
      )
    ]
  }).catch((err) => logger.warn(`seedRulesAcceptButton: ${err.message}`));
}

async function handleRulesInteraction(interaction) {
  if (!interaction.isButton() || interaction.customId !== IDS.acceptRules) return false;

  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  const mappings = getGradeMappings(guildId);
  const inviteRoleId = mappings[GRADE_NAMES.invite];
  const isInvite = inviteRoleId && interaction.member?.roles?.cache?.has(inviteRoleId);
  if (!isInvite) {
    await replyEphemeral(interaction, '✅ Tu es déjà Membre — le règlement est déjà validé pour toi.');
    return true;
  }

  if (hasAcceptedRules(guildId, userId)) {
    await replyEphemeral(interaction, '✅ Tu as déjà accepté le règlement.');
    return true;
  }

  markRulesAccepted(guildId, userId);
  await replyEphemeral(interaction, '✅ Règlement accepté ! Tu peux maintenant faire ta demande de membre dans **#devenir-membre**.');
  return true;
}

module.exports = {
  IDS,
  isCommunityGuild,
  getRulesRequired,
  hasAcceptedRules,
  markRulesAccepted,
  seedRulesAcceptButton,
  handleRulesInteraction
};
