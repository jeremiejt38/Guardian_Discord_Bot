const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
  getAvailableLanguages,
  getLanguageLabel,
  getGuildLanguage,
  t,
  describe
} = require('../modules/i18n');
const { replyEphemeral } = require('../modules/utils/interactions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('langues')
    .setDescription(describe('commands.langues.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const activeCode = getGuildLanguage(interaction.guildId);
    const activeLabel = getLanguageLabel(activeCode);
    const languages = getAvailableLanguages();

    const lines = [
      `**${t(interaction.guildId, 'commands.langues.title')}**`,
      t(interaction.guildId, 'commands.langues.current', { language: activeLabel, code: activeCode }),
      ''
    ];

    for (const code of languages) {
      lines.push(
        t(interaction.guildId, 'commands.langues.item', {
          language: getLanguageLabel(code),
          code
        })
      );
    }

    await replyEphemeral(interaction, lines.join('\n').trim());
  }
};
