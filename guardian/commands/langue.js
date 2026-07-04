const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  getLanguageLabel,
  setGuildLanguage,
  t,
  tForLanguage
} = require('../modules/i18n');

const MAX_CHOICES = 25;

function buildLanguageChoices() {
  return getAvailableLanguages()
    .slice(0, MAX_CHOICES)
    .map((code) => ({ name: getLanguageLabel(code).slice(0, 100), value: code }));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('langue')
    .setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.langue.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => {
      const withChoices = option
        .setName('code')
        .setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.langue.optionCode'))
        .setRequired(true);

      const choices = buildLanguageChoices();
      if (choices.length > 0) {
        withChoices.addChoices(...choices);
      }

      return withChoices;
    }),
  async execute(interaction) {
    const selectedCode = interaction.options.getString('code', true);
    const language = setGuildLanguage(interaction.guildId, selectedCode);
    const label = getLanguageLabel(language);

    await interaction.reply({
      content: t(interaction.guildId, 'commands.langue.updated', { language: label }),
      ephemeral: true
    });
  }
};
