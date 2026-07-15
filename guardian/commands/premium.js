const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { buildPremiumLockButton } = require('../modules/tier/premiumGateUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Découvrir Guardian Premium')
    .setDMPermission(true),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Guardian Premium')
      .setDescription('Découvrez les fonctionnalités premium de Guardian :')
      .addFields(
        { name: '🔒 Paramètres Discord avancés', value: 'Personnalisez davantage vos serveurs Discord', inline: false },
        { name: '🔨 Sanctions de comportement', value: 'Gérez les comportements des membres avec plus de flexibilité', inline: false },
        { name: '✉️ DM de bienvenue personnalisé', value: 'Envoyez un message de bienvenue personnalisé aux nouveaux membres', inline: false },
        { name: '💬 Forum de suggestions', value: 'Permettez à vos membres de proposer des idées', inline: false },
        { name: '📊 Liste des serveurs', value: 'Visualisez tous les serveurs gérés par Guardian', inline: false }
      )
      .setColor(0x0099FF)
      .setTimestamp();

    const button = buildPremiumLockButton('premium_info', 'Passer à Guardian Premium');
    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }
};
