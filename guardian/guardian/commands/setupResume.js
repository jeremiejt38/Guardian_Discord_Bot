const { SlashCommandBuilder } = require('discord.js');
const { setupFlow } = require('../modules/initialisation/setupFlow');
const { t } = require('../i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-resume')
    .setDescription('Reprendre l\'assistant d\'installation pour ce serveur'),
  async execute(interaction) {
    // Vérifier si l'utilisateur a la permission de gérer le serveur
    if (!interaction.member.permissions.has('ManageGuild')) {
      await interaction.reply({
        content: t('setupResume.noPermission', interaction.locale),
        ephemeral: true
      });
      return;
    }

    // Vérifier que ce n'est pas l'administrateur du bot
    const botAdminId = process.env.BOT_ADMIN_ID;
    if (interaction.user.id === botAdminId) {
      await interaction.reply({
        content: t('setupResume.adminCannotUse', interaction.locale),
        ephemeral: true
      });
      return;
    }

    try {
      // Démarrer le wizard d'installation
      await setupFlow(interaction);
    } catch (error) {
      console.error('Erreur lors de la reprise de l\'assistant d\'installation:', error);
      await interaction.reply({
        content: t('setupResume.error', interaction.locale),
        ephemeral: true
      });
    }
  },
};
