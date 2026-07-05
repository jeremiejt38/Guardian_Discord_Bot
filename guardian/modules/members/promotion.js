const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { getDb, getGrade } = require('../../database/db');
const { GRADE_NAMES, CHANNEL_NAMES } = require('../../config');
const { getGuildSetting } = require('../config/settings');
const { findTextChannelByName } = require('../utils/channels');
const { replyEphemeral } = require('../utils/interactions');
const { getSponsorship } = require('./parrainage');
const logger = require('../logs/logger');
const { t } = require('../../locales');

const IDS = Object.freeze({
  request: 'member:request',
  submitBioModal: 'member:request:bio',
  acceptPrefix: 'member:request:accept',
  rejectPrefix: 'member:request:reject',
  replyPrefix: 'member:request:reply',
  rejectReasonModalPrefix: 'member:request:reject:reason',
  replyMessageModalPrefix: 'member:request:reply:message'
});

const ORDERED_GRADES = Object.freeze([
  GRADE_NAMES.invite,
  GRADE_NAMES.membre,
  GRADE_NAMES.moderateur,
  GRADE_NAMES.manager,
  GRADE_NAMES.owner
]);

function getGradeRole(guildId, gradeName) {
  return getGrade(guildId, gradeName);
}

function getMemberRecord(guildId, userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM members WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
}

function getPendingPromotionRequestForUser(guildId, userId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT request_id FROM promotion_requests
       WHERE guild_id = ? AND user_id = ? AND status = 'pending'
       ORDER BY request_id DESC
       LIMIT 1`
    )
    .get(guildId, userId);
}

function createPromotionRequest(guildId, userId, bio, sponsorshipId) {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO promotion_requests (guild_id, user_id, status, bio, sponsorship_id, created_at)
     VALUES (?, ?, 'pending', ?, ?, ?)`
  ).run(guildId, userId, bio || null, sponsorshipId || null, now);

  return db
    .prepare(
      `SELECT request_id, guild_id, user_id, status, bio, sponsorship_id, message_id
       FROM promotion_requests
       WHERE guild_id = ? AND user_id = ?
       ORDER BY request_id DESC
       LIMIT 1`
    )
    .get(guildId, userId);
}

function setPromotionRequestMessageId(requestId, messageId) {
  const db = getDb();
  db.prepare('UPDATE promotion_requests SET message_id = ? WHERE request_id = ?').run(messageId, requestId);
}

function deletePromotionRequest(requestId) {
  const db = getDb();
  db.prepare('DELETE FROM promotion_requests WHERE request_id = ?').run(requestId);
}

function getPromotionRequestById(requestId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT request_id, guild_id, user_id, status, bio, sponsorship_id, message_id
       FROM promotion_requests
       WHERE request_id = ?`
    )
    .get(requestId);
}

function markPromotionRequestReviewed(requestId, status, reviewedBy, reason = null) {
  const db = getDb();
  db.prepare(
    `UPDATE promotion_requests
     SET status = ?, reviewed_at = ?, reviewed_by = ?, reason = ?
     WHERE request_id = ?`
  ).run(status, new Date().toISOString(), reviewedBy, reason, requestId);
}

function setMemberGrade(guildId, userId, grade, bio = undefined) {
  const db = getDb();
  const payloadBio = bio === undefined ? null : bio;
  db.prepare(
    `INSERT INTO members (guild_id, user_id, grade, join_date, bio)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(guild_id, user_id)
     DO UPDATE SET grade = excluded.grade, bio = COALESCE(excluded.bio, members.bio)`
  ).run(guildId, userId, grade, new Date().toISOString(), payloadBio);
}

function hasRequiredReviewerGrade(member, guildId, requiredGrade) {
  const startIndex = ORDERED_GRADES.indexOf(requiredGrade);
  const allowedGrades = startIndex >= 0 ? ORDERED_GRADES.slice(startIndex) : [GRADE_NAMES.moderateur];

  return allowedGrades.some((grade) => {
    const roleId = getGradeRole(guildId, grade);
    return roleId && member.roles.cache.has(roleId);
  });
}

function parseHoursSince(dateIso) {
  const date = new Date(dateIso).getTime();
  if (!date) {
    return 0;
  }

  const diffMs = Math.max(0, Date.now() - date);
  return Math.floor(diffMs / (60 * 60 * 1000));
}

async function postPromotionRequest(guild, user, payload) {
  const channel = findTextChannelByName(guild, CHANNEL_NAMES.requests);
  if (!channel) {
    return null;
  }

  const embed = new EmbedBuilder()
    .setTitle(t('promotion.requestEmbedTitle', {}, { guildId: guild.id }))
    .setDescription([
      `- ${t('promotion.requestEmbedUser', {}, { guildId: guild.id })}: <@${user.id}>`,
      `- ${t('promotion.requestEmbedJoinedHours', { hours: payload.joinedHours }, { guildId: guild.id })}`,
      `- ${t('promotion.requestEmbedBio', {}, { guildId: guild.id })}: ${payload.bio || t('promotion.none', {}, { guildId: guild.id })}`,
      `- ${t('promotion.requestEmbedSponsorship', {}, { guildId: guild.id })}: ${payload.sponsorship || t('promotion.none', {}, { guildId: guild.id })}`
    ].join('\n'))
    .setThumbnail(user.displayAvatarURL())
    .setTimestamp(new Date());

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${IDS.acceptPrefix}:${payload.requestId}`)
      .setStyle(ButtonStyle.Success)
      .setLabel(t('promotion.accept', {}, { guildId: guild.id })),
    new ButtonBuilder()
      .setCustomId(`${IDS.rejectPrefix}:${payload.requestId}`)
      .setStyle(ButtonStyle.Danger)
      .setLabel(t('promotion.reject', {}, { guildId: guild.id })),
    new ButtonBuilder()
      .setCustomId(`${IDS.replyPrefix}:${payload.requestId}`)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(t('promotion.reply', {}, { guildId: guild.id }))
  );

  const message = await channel.send({ embeds: [embed], components: [actions] });
  return message;
}

async function processPromotionRequest(interaction, bio = null) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const memberRecord = getMemberRecord(guildId, userId);

  if (!memberRecord || memberRecord.grade !== GRADE_NAMES.invite) {
    await replyEphemeral(interaction, t('promotion.notInvite', {}, { guildId }));
    return true;
  }

  const minDelayHours = Number(getGuildSetting(guildId, 'members', 'promotion_delay_hours', 48));
  const joinedHours = parseHoursSince(memberRecord.join_date);
  if (joinedHours < minDelayHours) {
    await replyEphemeral(interaction, t('promotion.delayNotReached', { remaining: minDelayHours - joinedHours }, { guildId }));
    return true;
  }

  const sponsorshipRequired = Boolean(getGuildSetting(guildId, 'members', 'sponsorship_required', false));
  const sponsorship = getSponsorship(guildId, userId);
  if (sponsorshipRequired && !sponsorship) {
    await replyEphemeral(interaction, t('promotion.sponsorshipRequired', {}, { guildId }));
    return true;
  }

  const pending = getPendingPromotionRequestForUser(guildId, userId);
  if (pending) {
    await replyEphemeral(interaction, t('promotion.pendingExists', {}, { guildId }));
    return true;
  }

  const request = createPromotionRequest(guildId, userId, bio, sponsorship?.parrain_id || null);

  const requestMessage = await postPromotionRequest(interaction.guild, interaction.user, {
    requestId: request.request_id,
    joinedHours,
    bio,
    sponsorship: sponsorship ? `<@${sponsorship.parrain_id}>` : null
  });

  if (!requestMessage) {
    deletePromotionRequest(request.request_id);
    await replyEphemeral(interaction, t('promotion.requestsChannelMissing', {}, { guildId }));
    return true;
  }

  setPromotionRequestMessageId(request.request_id, requestMessage.id);

  if (bio) {
    setMemberGrade(guildId, userId, GRADE_NAMES.invite, bio);
  }

  await replyEphemeral(interaction, t('promotion.requestSubmitted', {}, { guildId }));

  return true;
}

async function openBioModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(IDS.submitBioModal)
    .setTitle(t('promotion.bioModalTitle', {}, { guildId: interaction.guildId }));

  const bioInput = new TextInputBuilder()
    .setCustomId('bio')
    .setLabel(t('promotion.bioModalLabel', {}, { guildId: interaction.guildId }))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(400);

  modal.addComponents(new ActionRowBuilder().addComponents(bioInput));
  await interaction.showModal(modal);
  return true;
}

function disableDecisionButtons(message) {
  const disabledRows = message.components.map((row) => {
    const newButtons = row.components.map((component) => ButtonBuilder.from(component).setDisabled(true));
    return new ActionRowBuilder().addComponents(newButtons);
  });

  return disabledRows;
}

async function disableRequestMessageById(guild, messageId, content) {
  if (!messageId) {
    return;
  }

  const channel = findTextChannelByName(guild, CHANNEL_NAMES.requests);
  if (!channel) {
    return;
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    return;
  }

  await message.edit({
    content,
    components: disableDecisionButtons(message)
  }).catch(() => undefined);
}

function parseRequestId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

async function handleDecision(interaction, action, requestId) {
  const guildId = interaction.guildId;
  const requiredGrade = getGuildSetting(guildId, 'members', 'promotion_review_grade', GRADE_NAMES.moderateur);

  if (!hasRequiredReviewerGrade(interaction.member, guildId, requiredGrade)) {
    await replyEphemeral(interaction, t('promotion.reviewerForbidden', {}, { guildId }));
    return true;
  }

  const request = getPromotionRequestById(requestId);
  if (!request || request.guild_id !== guildId) {
    await replyEphemeral(interaction, t('promotion.requestNotFound', {}, { guildId }));
    return true;
  }

  if (request.status !== 'pending') {
    await replyEphemeral(interaction, t('promotion.requestAlreadyHandled', {}, { guildId }));
    return true;
  }

  const targetUserId = request.user_id;

  if (action === 'accept') {
    const guild = interaction.guild;
    const member = await guild.members.fetch(targetUserId).catch(() => null);
    if (!member) {
      await replyEphemeral(interaction, t('promotion.targetMissing', {}, { guildId }));
      return true;
    }

    const inviteRole = getGradeRole(guildId, GRADE_NAMES.invite);
    const memberRole = getGradeRole(guildId, GRADE_NAMES.membre);

    if (inviteRole && member.roles.cache.has(inviteRole)) {
      await member.roles.remove(inviteRole).catch(() => undefined);
    }

    if (memberRole) {
      await member.roles.add(memberRole).catch(() => undefined);
    }

    setMemberGrade(guildId, targetUserId, GRADE_NAMES.membre);
    markPromotionRequestReviewed(request.request_id, 'accepted', interaction.user.id, null);

    const general = findTextChannelByName(guild, 'general');
    if (general) {
      await general.send(t('promotion.welcomeGeneral', { user: `<@${targetUserId}>` }, { guildId }));
    }

    await member.send(t('promotion.acceptedDm', {}, { guildId })).catch(() => undefined);
    await logger.logToDiscord(guild, t('promotion.acceptedLog', { user: `<@${targetUserId}>`, staff: `<@${interaction.user.id}>` }, { guildId }));

    await interaction.update({
      content: t('promotion.acceptedPublic', { user: `<@${targetUserId}>` }, { guildId }),
      components: disableDecisionButtons(interaction.message)
    });

    return true;
  }

  if (action === 'reject') {
    const modal = new ModalBuilder()
      .setCustomId(`${IDS.rejectReasonModalPrefix}:${request.request_id}`)
      .setTitle(t('promotion.rejectModalTitle', {}, { guildId }));

    const input = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel(t('promotion.rejectModalLabel', {}, { guildId }))
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(400);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return true;
  }

  if (action === 'reply') {
    const modal = new ModalBuilder()
      .setCustomId(`${IDS.replyMessageModalPrefix}:${request.request_id}`)
      .setTitle(t('promotion.replyModalTitle', {}, { guildId }));

    const input = new TextInputBuilder()
      .setCustomId('message')
      .setLabel(t('promotion.replyModalLabel', {}, { guildId }))
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(800);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return true;
  }

  return false;
}

async function handlePromotionInteraction(interaction) {
  if (!interaction.guildId || !interaction.customId) {
    return false;
  }

  const guildId = interaction.guildId;

  if (interaction.isButton() && interaction.customId === IDS.request) {
    const bioRequired = Boolean(getGuildSetting(guildId, 'members', 'bio_required', false));
    if (bioRequired) {
      return openBioModal(interaction);
    }

    return processPromotionRequest(interaction, null);
  }

  if (interaction.isButton() && interaction.customId.startsWith(`${IDS.acceptPrefix}:`)) {
    const requestId = parseRequestId(interaction.customId.split(':').pop());
    if (!requestId) {
      return false;
    }
    return handleDecision(interaction, 'accept', requestId);
  }

  if (interaction.isButton() && interaction.customId.startsWith(`${IDS.rejectPrefix}:`)) {
    const requestId = parseRequestId(interaction.customId.split(':').pop());
    if (!requestId) {
      return false;
    }
    return handleDecision(interaction, 'reject', requestId);
  }

  if (interaction.isButton() && interaction.customId.startsWith(`${IDS.replyPrefix}:`)) {
    const requestId = parseRequestId(interaction.customId.split(':').pop());
    if (!requestId) {
      return false;
    }
    return handleDecision(interaction, 'reply', requestId);
  }

  if (interaction.isModalSubmit() && interaction.customId === IDS.submitBioModal) {
    const bio = interaction.fields.getTextInputValue('bio').trim();
    return processPromotionRequest(interaction, bio || null);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith(`${IDS.rejectReasonModalPrefix}:`)) {
    const requestId = parseRequestId(interaction.customId.split(':').pop());
    if (!requestId) {
      return false;
    }
    const request = getPromotionRequestById(requestId);
    if (!request || request.guild_id !== guildId) {
      await replyEphemeral(interaction, t('promotion.requestNotFound', {}, { guildId }));
      return true;
    }

    if (request.status !== 'pending') {
      await replyEphemeral(interaction, t('promotion.requestAlreadyHandled', {}, { guildId }));
      return true;
    }

    const targetUserId = request.user_id;
    const reason = interaction.fields.getTextInputValue('reason').trim();
    const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);

    if (member) {
      await member.send(t('promotion.rejectedDm', { reason: reason || t('promotion.none', {}, { guildId }) }, { guildId })).catch(() => undefined);
      await logger.logToDiscord(
        interaction.guild,
        t('promotion.rejectedLog', { user: `<@${targetUserId}>`, staff: `<@${interaction.user.id}>` }, { guildId })
      );
    }

    markPromotionRequestReviewed(request.request_id, 'rejected', interaction.user.id, reason || null);
    await disableRequestMessageById(
      interaction.guild,
      request.message_id,
      t('promotion.rejectedPublic', { user: `<@${targetUserId}>` }, { guildId })
    );

    await replyEphemeral(interaction, t('promotion.rejectedPublic', { user: `<@${targetUserId}>` }, { guildId }));
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith(`${IDS.replyMessageModalPrefix}:`)) {
    const requestId = parseRequestId(interaction.customId.split(':').pop());
    if (!requestId) {
      return false;
    }

    const request = getPromotionRequestById(requestId);
    if (!request || request.guild_id !== guildId) {
      await replyEphemeral(interaction, t('promotion.requestNotFound', {}, { guildId }));
      return true;
    }

    const targetUserId = request.user_id;
    const message = interaction.fields.getTextInputValue('message').trim();
    const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);

    if (member && message) {
      await member.send(message).catch(() => undefined);
    }

    await replyEphemeral(interaction, t('promotion.replySent', { user: `<@${targetUserId}>` }, { guildId }));
    return true;
  }

  return false;
}

module.exports = {
  IDS,
  handlePromotionInteraction
};
