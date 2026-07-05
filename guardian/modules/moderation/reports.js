const {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const { getDb } = require('../../database/db');
const { CHANNELS } = require('../../config');
const { t } = require('../i18n');
const logger = require('../logs/logger');

const CUSTOM_IDS = Object.freeze({
  openButton: 'report:open',
  modal: 'report:modal',
  targetInput: 'report:target',
  reasonInput: 'report:reason',
  evidenceInput: 'report:evidence',
  handled: 'report:handled'
});

function createReport(guildId, reporterId, targetText, reason, evidence) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO reports (guild_id, reporter_id, target_text, reason, evidence, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`
    )
    .run(guildId, reporterId, targetText, reason, evidence || null, new Date().toISOString());
  return result.lastInsertRowid;
}

function updateReportMessageId(reportId, messageId) {
  const db = getDb();
  db.prepare('UPDATE reports SET message_id = ? WHERE report_id = ?').run(messageId, reportId);
}

function getReport(reportId) {
  const db = getDb();
  return db.prepare('SELECT * FROM reports WHERE report_id = ?').get(reportId);
}

function resolveReport(reportId, handledBy) {
  const db = getDb();
  const row = db.prepare('SELECT status FROM reports WHERE report_id = ?').get(reportId);
  if (!row) return null;
  if (row.status === 'handled') return 'already_handled';
  db.prepare(
    'UPDATE reports SET status = ?, handled_at = ?, handled_by = ? WHERE report_id = ?'
  ).run('handled', new Date().toISOString(), handledBy, reportId);
  return 'ok';
}

async function handleOpenReportButton(interaction) {
  const guildId = interaction.guildId;
  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.modal)
    .setTitle(t(guildId, 'reports.modalTitle'))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(CUSTOM_IDS.targetInput)
          .setLabel(t(guildId, 'reports.modalTarget'))
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(CUSTOM_IDS.reasonInput)
          .setLabel(t(guildId, 'reports.modalReason'))
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(CUSTOM_IDS.evidenceInput)
          .setLabel(t(guildId, 'reports.modalEvidence'))
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
      )
    );
  await interaction.showModal(modal);
}

async function handleReportModalSubmit(interaction) {
  const guildId = interaction.guildId;
  const targetText = interaction.fields.getTextInputValue(CUSTOM_IDS.targetInput);
  const reason = interaction.fields.getTextInputValue(CUSTOM_IDS.reasonInput);
  const evidence = interaction.fields.getTextInputValue(CUSTOM_IDS.evidenceInput) || null;

  const reportsChannel = interaction.guild.channels.cache.find(
    (ch) => ch.name === CHANNELS.reports && ch.isTextBased?.()
  );

  if (!reportsChannel) {
    await interaction.reply({ content: t(guildId, 'reports.channelMissing'), ephemeral: true });
    return;
  }

  const reportId = createReport(guildId, interaction.user.id, targetText, reason, evidence);

  const embed = new EmbedBuilder()
    .setTitle(t(guildId, 'reports.embedTitle'))
    .addFields(
      { name: t(guildId, 'reports.embedReporter'), value: `<@${interaction.user.id}>`, inline: true },
      { name: t(guildId, 'reports.embedTarget'), value: targetText, inline: true },
      { name: t(guildId, 'reports.embedReason'), value: reason, inline: false },
      { name: t(guildId, 'reports.embedEvidence'), value: evidence || t(guildId, 'reports.none'), inline: false }
    )
    .setTimestamp();

  const handledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CUSTOM_IDS.handled}:${reportId}`)
      .setLabel(t(guildId, 'reports.handledButton'))
      .setStyle(ButtonStyle.Success)
  );

  const msg = await reportsChannel.send({ embeds: [embed], components: [handledRow] });
  updateReportMessageId(reportId, msg.id);

  await interaction.reply({ content: t(guildId, 'reports.submitted'), ephemeral: true });
}

async function markReportHandled(interaction) {
  const guildId = interaction.guildId;
  const parts = interaction.customId.split(':');
  const reportId = Number(parts[parts.length - 1]);

  if (!reportId) {
    await interaction.reply({ content: t(guildId, 'reports.notFound'), ephemeral: true });
    return;
  }

  const result = resolveReport(reportId, interaction.user.id);

  if (result === null) {
    await interaction.reply({ content: t(guildId, 'reports.notFound'), ephemeral: true });
    return;
  }

  if (result === 'already_handled') {
    await interaction.reply({ content: t(guildId, 'reports.alreadyHandled'), ephemeral: true });
    return;
  }

  await logger.logToDiscord(
    interaction.guild,
    `Rapport #${reportId} marqué comme traité par <@${interaction.user.id}>`
  );

  await interaction.update({
    content: t(guildId, 'reports.handledPublic'),
    components: []
  });
}

module.exports = {
  CUSTOM_IDS,
  handleOpenReportButton,
  handleReportModalSubmit,
  markReportHandled
};
