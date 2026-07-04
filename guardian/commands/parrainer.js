const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSponsorship } = require('../modules/members/parrainage');
const { t, describe } = require('../modules/i18n');
const { replyEphemeral } = require('../modules/utils/interactions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('parrainer')
    .setDescription(describe('commands.parrainer.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addUserOption((option) => option.setName('pseudo').setDescription(describe('commands.parrainer.inviteOption')).setRequired(true)),
  async execute(interaction) {
    const invite = interaction.options.getUser('pseudo', true);
    saveSponsorship(interaction.guildId, interaction.user.id, invite.id);
    await replyEphemeral(
      interaction,
      t(interaction.guildId, 'commands.parrainer.success', { invite: invite.toString() })
    );
  }
};
