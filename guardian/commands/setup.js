const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const getCurrentStep = require('../modules/initialisation/setupGrades').getCurrentStep;
const isGuildInstalled = require('../modules/initialisation/checkInstall').isGuildInstalled;
const buildStepPayload = require('../modules/initialisation/setupFlow').buildStepPayload;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Gerer la configuration Guardian')
		.addSubcommand(subcommand =>
			subcommand
				.setName('resume')
				.setDescription('Reprendre le wizard de configuration depuis l etape actuelle')),
	async execute(interaction) {
		// Vérifier que l'utilisateur est admin de la guild
		if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			await interaction.reply({
				content: 'Vous n\'avez pas la permission de gérer le serveur.',
				ephemeral: true
			});
			return;
		}

		const guildId = interaction.guild.id;

		// Vérifier que la guild est installée
		if (!isGuildInstalled(guildId)) {
			await interaction.reply({
				content: 'Guardian non configure sur ce serveur',
				ephemeral: true
			});
			return;
		}

		// Récupérer l'étape courante
		const currentStep = getCurrentStep(guildId);

		// Si l'étape est >= 9, la configuration est terminée
		if (currentStep >= 9) {
			await interaction.reply({
				content: 'La configuration est terminee. Utilise /status pour voir l\'etat.',
				ephemeral: true
			});
			return;
		}

		// Construire le contenu de l'étape
		const payload = buildStepPayload(guildId, interaction.guild, currentStep);

		// Répondre en ephemeral avec le contenu de l'étape
		await interaction.reply({
			embeds: payload.embeds,
			components: payload.components,
			ephemeral: true
		});
	},
};
