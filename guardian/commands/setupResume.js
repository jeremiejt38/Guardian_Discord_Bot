const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isBotAdmin } = require('../modules/admin/botUpdater');
const { resumeWizard } = require('../modules/initialisation/setupFlow');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-resume')
    .setDescription('Reprend le wizard de configuration là où il s\'est arrêté'),
  async execute(interaction) {
    if (isBotAdmin(interaction.user.id)) {
      await interaction.reply({
        content: 'Le bot admin ne peut pas utiliser cette commande.',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: 'Vous n\'avez pas la permission de gérer le serveur.',
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      await resumeWizard(interaction);
      await interaction.editReply({ content: 'Le wizard a repris dans ce channel.' });
    } catch (err) {
      await interaction.editReply({ content: 'Impossible de reprendre le wizard.' });
      throw err;
    }
  },
};
