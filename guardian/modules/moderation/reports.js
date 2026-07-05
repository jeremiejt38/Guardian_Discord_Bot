const { t } = require('../i18n');
const { replyEphemeral } = require('../utils/interactions');

async function markReportHandled(interaction) {
  await replyEphemeral(interaction, t(interaction.guildId, 'reports.handled'));
}

module.exports = {
  markReportHandled
};
