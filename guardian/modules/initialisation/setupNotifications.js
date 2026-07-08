'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GRADE_NAMES, CHANNELS } = require('../../config');
const { getGuildSetting } = require('../config/settings');

let CUSTOM_IDS_REF = null;
function setCustomIds(ids) { CUSTOM_IDS_REF = ids; }

// ─── Notification membres à l'installation ───────────────────────────────────

function buildNotifyMembersContent(guildId) {
  const expulsionEnabled = Boolean(getGuildSetting(guildId, 'members', 'invite_expulsion_enabled', true));
  const expulsionDays = Math.max(1, Number(getGuildSetting(guildId, 'members', 'invite_expulsion_days', 30)));
  return [
    `## 📢 Notifier les membres existants ?`,
    ``,
    `Tu peux envoyer un DM à **tous les membres actuels** du serveur pour les informer que Guardian Bot est maintenant actif.`,
    ``,
    `Les invités recevront en plus :`,
    `- Leur statut actuel et comment devenir Membre`,
    expulsionEnabled ? `- Un avertissement sur l'expulsion automatique après **${expulsionDays} jour${expulsionDays > 1 ? 's' : ''}** d'inactivité` : '',
    `- Un lien direct vers **#${CHANNELS.becomeMember}**`,
    ``,
    `> ⚠️ Cette action envoie un DM à chaque membre non-bot du serveur.`
  ].filter((l) => l !== '').join('\n');
}

function buildNotifyMembersComponents(CUSTOM_IDS) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.notifyMembersYes)
        .setLabel('📢 Oui, notifier tout le monde')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.notifyMembersNo)
        .setLabel('Non, passer')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function sendInstallNotifyDm(member, guildId) {
  try {
    const expulsionEnabled = Boolean(getGuildSetting(guildId, 'members', 'invite_expulsion_enabled', true));
    const expulsionDays = Math.max(1, Number(getGuildSetting(guildId, 'members', 'invite_expulsion_days', 30)));
    const promotionDelayHours = Number(getGuildSetting(guildId, 'members', 'promotion_delay_hours', 48));
    const { getGrade } = require('../../database/db');
    const inviteRoleId = getGrade(guildId, GRADE_NAMES.invite);
    const isInvite = inviteRoleId ? member.roles.cache.has(inviteRoleId) : false;

    const becomeMemberChannel = member.guild.channels.cache.find(
      (c) => c.name === CHANNELS.becomeMember && c.isTextBased?.()
    );
    const becomeMemberLink = becomeMemberChannel
      ? `https://discord.com/channels/${guildId}/${becomeMemberChannel.id}`
      : null;

    const lines = [
      `## 🤖 Guardian Bot est arrivé sur **${member.guild.name}** !`,
      ``,
      `Guardian Bot vient d'être installé sur ce serveur. Il gère automatiquement les grades, la modération, les salons de jeux et bien plus.`,
      ``
    ];

    if (isInvite) {
      lines.push(
        `**🎭 Ton statut actuel : Invité**`,
        `Tu as accès limité au serveur pour l'instant.`,
        ``,
        `**📋 Devenir Membre**`,
        `Pour accéder à toute la communauté, fais une demande de membre.`,
        promotionDelayHours > 0 ? `> Tu pourras faire ta demande après **${promotionDelayHours}h** de présence sur le serveur.` : `> Tu peux faire ta demande dès maintenant.`,
        becomeMemberLink ? `> 🔗 **[Voir le channel Devenir Membre](${becomeMemberLink})**` : `> Rends-toi dans **#${CHANNELS.becomeMember}** sur le serveur.`,
        ``
      );
      if (expulsionEnabled) {
        lines.push(
          `**⚠️ Expulsion automatique**`,
          `En tant qu'invité, si tu restes inactif pendant **${expulsionDays} jour${expulsionDays > 1 ? 's' : ''}** (sans écrire ni rejoindre un vocal), tu seras automatiquement expulsé.`,
          `> Pour éviter ça, deviens Membre ou reste actif régulièrement.`,
          ``
        );
      }
    } else {
      lines.push(
        `Aucune action requise de ta part. Toutes les configurations existantes sont préservées.`,
        ``
      );
    }

    lines.push(`_Ce message est envoyé automatiquement par Guardian Bot._`);
    await member.send(lines.join('\n'));
  } catch {
  }
}

// ─── Nouvelles options MAJ helpers ───────────────────────────────────────────

function semverToInt(v) {
  const [major = 0, minor = 0, patch = 0] = (v || '0.0.0').split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}

function getPendingNewOptions(guildId, guild, CHANNEL_SLOTS, getActiveSlotsForInstall) {
  const installVersion = getGuildSetting(guildId, 'bot', 'install_version', null);
  if (!installVersion) return [];
  const installInt = semverToInt(installVersion);
  const slots = guild ? getActiveSlotsForInstall(guildId, guild) : CHANNEL_SLOTS;
  return slots.filter((slot) => {
    const slotInt = semverToInt(slot.addedInVersion || '0.1.0');
    if (slotInt <= installInt) return false;
    const configured = getGuildSetting(guildId, slot.settingSection, slot.settingKey, null);
    return !configured;
  });
}

function buildNewOptionsContent(guildId, guild, CHANNEL_SLOTS, getActiveSlotsForInstall) {
  const pending = getPendingNewOptions(guildId, guild, CHANNEL_SLOTS, getActiveSlotsForInstall);
  const cursor = getGuildSetting(guildId, 'setup', 'new_options_cursor', 0);
  const slot = pending[cursor];
  if (!slot) return '✅ Toutes les nouvelles options ont été configurées.';
  return [
    `## 🆕 Nouvelles options disponibles depuis votre installation (${cursor + 1}/${pending.length})`,
    '',
    `**${slot.emoji} ${slot.label}**`,
    `> ${slot.desc}`,
    '',
    `Lier un channel existant ou ignorer pour laisser Guardian le créer.`
  ].join('\n');
}

function buildNewOptionsComponents(guildId, guild, CUSTOM_IDS, CHANNEL_SLOTS, getActiveSlotsForInstall) {
  const pending = getPendingNewOptions(guildId, guild, CHANNEL_SLOTS, getActiveSlotsForInstall);
  const cursor = getGuildSetting(guildId, 'setup', 'new_options_cursor', 0);
  const slot = pending[cursor];
  if (!slot) return [];
  const isLast = cursor >= pending.length - 1;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.channelSelectPrefix}:${slot.key}`)
      .setLabel(`Lier ${slot.label}`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(isLast ? CUSTOM_IDS.newOptionsSkip : CUSTOM_IDS.newOptionsNext)
      .setLabel(isLast ? 'Terminer' : 'Passer →')
      .setStyle(ButtonStyle.Secondary)
  );
  return [row];
}

function buildNewOptionsDoneContent() {
  return [
    '## ✅ Nouvelles options configurées',
    '',
    'Toutes les nouvelles options ont été traitées. Tu peux maintenant finaliser le setup.',
    '',
    '> Appuie sur **Finaliser** pour terminer.'
  ].join('\n');
}

function buildNewOptionsDoneRow(CUSTOM_IDS) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.finalize)
      .setLabel('Finaliser ✅')
      .setStyle(ButtonStyle.Success)
  );
}

module.exports = {
  buildNotifyMembersContent,
  buildNotifyMembersComponents,
  sendInstallNotifyDm,
  semverToInt,
  getPendingNewOptions,
  buildNewOptionsContent,
  buildNewOptionsComponents,
  buildNewOptionsDoneContent,
  buildNewOptionsDoneRow,
};
