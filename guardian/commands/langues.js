const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  getLanguageLabel,
  getGuildLanguage,
  t,
  tForLanguage
} = require('../modules/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('langues')
    .setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.langues.description'))
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

    await interaction.reply({
      content: lines.join('\n').trim(),
      ephemeral: true
    });
  }
};
