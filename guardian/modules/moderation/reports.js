const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { getDb } = require('../../database/db');
const { t } = require('../../locales');

const IDS = Object.freeze({
  open: 'report:open',
  submit: 'report:submit',
  handledPrefix: 'report:handled',
  panelButton: 'report:panel:open'
});

function insertReport(guildId, reporterId, targetText, reason, evidence) {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO reports (guild_id, reporter_id, target_text, reason, evidence, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?)`
  ).run(guildId, reporterId, targetText, reason, evidence || null, now);

  return db
    .prepare('SELECT report_id FROM reports WHERE guild_id = ? AND reporter_id = ? ORDER BY report_id DESC LIMIT 1')
    .get(guildId, reporterId);
}

function attachReportMessage(reportId, messageId) {
  const db = getDb();
  db.prepare('UPDATE reports SET message_id = ? WHERE report_id = ?').run(messageId, reportId);
}

function getReportById(reportId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT report_id, guild_id, reporter_id, target_text, reason, evidence, status, message_id
       FROM reports
       WHERE report_id = ?`
    )
    .get(reportId);
}

function markHandled(reportId, handledBy) {
  const db = getDb();
  db.prepare(
    `UPDATE reports
     SET status = 'handled', handled_at = ?, handled_by = ?
     WHERE report_id = ?`
  ).run(new Date().toISOString(), handledBy, reportId);
}

function disableActionButtons(message) {
  return message.components.map((row) => {
    const buttons = row.components.map((component) => ButtonBuilder.from(component).setDisabled(true));
    return new ActionRowBuilder().addComponents(buttons);
  });
}

async function ensureReportPanelForGuild(guild) {
  const channel = guild.channels.cache.find((item) => item.name === 'general' && item.isTextBased());
  if (!channel) {
    return;
  }

  const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const hasPanel = recent?.some(
    (message) =>
      message.author.id === guild.client.user.id &&
      message.components.some((row) => row.components.some((component) => component.customId === IDS.panelButton))
  );

  if (hasPanel) {
    return;
  }

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.panelButton)
      .setStyle(ButtonStyle.Danger)
      .setLabel(t('reports.panelButton', {}, { guildId: guild.id }))
  );

  await channel.send({
    content: t('reports.panelText', {}, { guildId: guild.id }),
    components: [actions]
  }).catch(() => undefined);
}

async function openReportModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(IDS.submit)
    .setTitle(t('reports.modalTitle', {}, { guildId: interaction.guildId }));

  const targetInput = new TextInputBuilder()
    .setCustomId('target')
    .setLabel(t('reports.modalTarget', {}, { guildId: interaction.guildId }))
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(120);

  const reasonInput = new TextInputBuilder()
    .setCustomId('reason')
    .setLabel(t('reports.modalReason', {}, { guildId: interaction.guildId }))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(700);

  const evidenceInput = new TextInputBuilder()
    .setCustomId('evidence')
    .setLabel(t('reports.modalEvidence', {}, { guildId: interaction.guildId }))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(700);

  modal.addComponents(
    new ActionRowBuilder().addComponents(targetInput),
    new ActionRowBuilder().addComponents(reasonInput),
    new ActionRowBuilder().addComponents(evidenceInput)
  );

  await interaction.showModal(modal);
  return true;
}

async function submitReport(interaction) {
  const guildId = interaction.guildId;
  const targetText = interaction.fields.getTextInputValue('target').trim();
  const reason = interaction.fields.getTextInputValue('reason').trim();
  const evidence = interaction.fields.getTextInputValue('evidence').trim();

  const report = insertReport(guildId, interaction.user.id, targetText, reason, evidence);
  const reportChannel = interaction.guild.channels.cache.find((item) => item.name === 'rapports' && item.isTextBased());

  if (!reportChannel) {
    await interaction.reply({
      content: t('reports.channelMissing', {}, { guildId }),
      ephemeral: true
    });
    return true;
  }

  const embed = new EmbedBuilder()
    .setTitle(t('reports.embedTitle', {}, { guildId }))
    .setDescription([
      `- ${t('reports.embedReporter', {}, { guildId })}: <@${interaction.user.id}>`,
      `- ${t('reports.embedTarget', {}, { guildId })}: ${targetText}`,
      `- ${t('reports.embedReason', {}, { guildId })}: ${reason}`,
      `- ${t('reports.embedEvidence', {}, { guildId })}: ${evidence || t('reports.none', {}, { guildId })}`
    ].join('\n'))
    .setTimestamp(new Date());

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${IDS.handledPrefix}:${report.report_id}`)
      .setStyle(ButtonStyle.Success)
      .setLabel(t('reports.handledButton', {}, { guildId }))
  );

  const message = await reportChannel.send({ embeds: [embed], components: [actions] });
  attachReportMessage(report.report_id, message.id);

  await interaction.reply({
    content: t('reports.submitted', {}, { guildId }),
    ephemeral: true
  });
  return true;
}

async function markReportHandled(interaction, reportId) {
  const report = getReportById(reportId);
  if (!report || report.guild_id !== interaction.guildId) {
    await interaction.reply({
      content: t('reports.notFound', {}, { guildId: interaction.guildId }),
      ephemeral: true
    });
    return true;
  }

  if (report.status === 'handled') {
    await interaction.reply({
      content: t('reports.alreadyHandled', {}, { guildId: interaction.guildId }),
      ephemeral: true
    });
    return true;
  }

  markHandled(report.report_id, interaction.user.id);
  await interaction.update({
    content: t('reports.handledPublic', {}, { guildId: interaction.guildId }),
    components: disableActionButtons(interaction.message)
  });
  return true;
}

function parseReportId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

async function handleReportInteraction(interaction) {
  if (!interaction.guildId || !interaction.customId) {
    return false;
  }

  if (interaction.isButton() && (interaction.customId === IDS.open || interaction.customId === IDS.panelButton)) {
    return openReportModal(interaction);
  }

  if (interaction.isButton() && interaction.customId.startsWith(`${IDS.handledPrefix}:`)) {
    const reportId = parseReportId(interaction.customId.split(':').pop());
    if (!reportId) {
      return false;
    }
    return markReportHandled(interaction, reportId);
  }

  if (interaction.isModalSubmit() && interaction.customId === IDS.submit) {
    return submitReport(interaction);
  }

  return false;
}

module.exports = {
  IDS,
  ensureReportPanelForGuild,
  handleReportInteraction
};
