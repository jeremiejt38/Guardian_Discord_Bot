const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSponsorship } = require('../modules/members/parrainage');
const { DEFAULT_LANGUAGE, t, tForLanguage } = require('../modules/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('parrainer')
    .setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.parrainer.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addUserOption((option) => option.setName('pseudo').setDescription(tForLanguage(DEFAULT_LANGUAGE, 'commands.parrainer.inviteOption')).setRequired(true)),
  async execute(interaction) {
    const invite = interaction.options.getUser('pseudo', true);
    saveSponsorship(interaction.guildId, interaction.user.id, invite.id);
    await interaction.reply({
      content: t(interaction.guildId, 'commands.parrainer.success', { invite: invite.toString() }),
      ephemeral: true
    });
  }
};
