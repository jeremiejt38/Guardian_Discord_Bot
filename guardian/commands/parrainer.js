const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSponsorship } = require('../modules/members/parrainage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('parrainer')
    .setDescription('Parrainer un invité')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .addUserOption((option) => option.setName('pseudo').setDescription('Invité à parrainer').setRequired(true)),
  async execute(interaction) {
    const invite = interaction.options.getUser('pseudo', true);
    saveSponsorship(interaction.guildId, interaction.user.id, invite.id);
    await interaction.reply({ content: `${invite} a bien été parrainé.`, ephemeral: true });
  }
};
