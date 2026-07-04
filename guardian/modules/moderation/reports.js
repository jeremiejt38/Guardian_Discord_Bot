const { t } = require('../i18n');

async function markReportHandled(interaction) {
  await interaction.reply({ content: t(interaction.guildId, 'reports.handled'), ephemeral: true });
}

module.exports = {
  markReportHandled
};
