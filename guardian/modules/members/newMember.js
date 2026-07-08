const { getDb, getGrade } = require('../../database/db');
const { GRADE_NAMES, CHANNELS } = require('../../config');
const { getGuildSetting } = require('../config/settings');
const { t } = require('../i18n');
const { findChannelByName } = require('../utils/channels');
const logger = require('../logs/logger');
const { IDS: PROMOTION_IDS } = require('./promotion');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function handleNewMember(member) {
  try {
    const inviteMode = getGuildSetting(member.guild.id, 'setup', 'invite_mode', 'classic');
    const assignedGrade = inviteMode === 'direct' ? GRADE_NAMES.membre : GRADE_NAMES.invite;
    const roleId = getGrade(member.guild.id, assignedGrade)
      ?? (inviteMode === 'direct' ? null : getGrade(member.guild.id, GRADE_NAMES.invite));
    if (roleId) {
      await member.roles.add(roleId);
    }

    const welcomeChannel = findChannelByName(member.guild, CHANNELS.welcome);
    if (welcomeChannel?.isTextBased()) {
      const delayHours = Number(getGuildSetting(member.guild.id, 'members', 'promotion_delay_hours', 48));
      const requestRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(PROMOTION_IDS.request)
          .setLabel(t(member.guild.id, 'promotion.requestButton'))
          .setStyle(ButtonStyle.Primary)
      );
      await welcomeChannel.send({
        content: t(member.guild.id, 'members.welcome', {
          member: member.toString(),
          guild: member.guild.name,
          delay: delayHours
        }),
        components: [requestRow]
      });
    }

    const db = getDb();
    const initialScore = 200;
    db.prepare(
      `INSERT INTO members (guild_id, user_id, grade, join_date, score_comportement)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id)
       DO UPDATE SET grade = excluded.grade, join_date = excluded.join_date`
    ).run(member.guild.id, member.id, assignedGrade, new Date().toISOString(), initialScore);

    try {
      const guildId = member.guild.id;
      const expulsionEnabled = Boolean(getGuildSetting(guildId, 'members', 'invite_expulsion_enabled', true));
      const expulsionDays = Math.max(1, Number(getGuildSetting(guildId, 'members', 'invite_expulsion_days', 30)));
      const promotionDelayHours = Number(getGuildSetting(guildId, 'members', 'promotion_delay_hours', 48));

      const becomeMemberChannel = findChannelByName(member.guild, CHANNELS.becomeMember);
      const becomeMemberLink = becomeMemberChannel
        ? `https://discord.com/channels/${guildId}/${becomeMemberChannel.id}`
        : null;

      const lines = [
        `## 👋 Bienvenue sur **${member.guild.name}** !`,
        ``,
        `Guardian Bot vient de te rejoindre sur ce serveur. Voici ce que tu dois savoir :`,
        ``,
        `**🎭 Ton statut actuel : Invité**`,
        `Tu as accès limité au serveur pour l'instant.`,
        ``,
        `**📋 Devenir Membre**`,
        `Pour accéder à toute la communauté, fais une demande de membre.`,
        promotionDelayHours > 0 ? `> Tu pourras faire ta demande après **${promotionDelayHours}h** de présence sur le serveur.` : `> Tu peux faire ta demande dès maintenant.`,
        becomeMemberLink ? `> 🔗 **[Voir le channel Devenir Membre](${becomeMemberLink})**` : `> Rends-toi dans le channel **#${CHANNELS.becomeMember}** sur le serveur.`,
        ``
      ];

      if (expulsionEnabled) {
        lines.push(
          `**⚠️ Attention — Expulsion automatique**`,
          `En tant qu'invité, si tu restes inactif pendant **${expulsionDays} jour${expulsionDays > 1 ? 's' : ''}** (sans écrire ni rejoindre un vocal), tu seras automatiquement expulsé du serveur.`,
          `> Pour éviter ça, deviens Membre ou reste actif régulièrement.`,
          ``
        );
      }

      lines.push(`_Ce message est envoyé automatiquement par Guardian Bot._`);

      await member.send(lines.join('\n'));
    } catch {
    }
  } catch (error) {
    logger.error('Failed to process new member', error);
  }
}

function canPromoteInvite(record, options = {}) {
  const {
    minDays = 0,
    bioRequired = false,
    parrainRequired = false,
    now = new Date()
  } = options;

  if (!record?.join_date) {
    return false;
  }

  const joinDate = new Date(record.join_date);
  if (Number.isNaN(joinDate.getTime())) {
    return false;
  }

  const ageMs = now.getTime() - joinDate.getTime();
  const minAgeMs = minDays * 24 * 60 * 60 * 1000;
  if (ageMs < minAgeMs) {
    return false;
  }

  if (bioRequired && !String(record.bio || '').trim()) {
    return false;
  }

  if (parrainRequired && !String(record.parrain_id || '').trim()) {
    return false;
  }

  return true;
}

module.exports = {
  handleNewMember,
  canPromoteInvite
};
