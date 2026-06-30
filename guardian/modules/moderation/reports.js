async function markReportHandled(interaction) {
  await interaction.reply({ content: 'Rapport marqué comme traité.', ephemeral: true });
}

module.exports = {
  markReportHandled
};
