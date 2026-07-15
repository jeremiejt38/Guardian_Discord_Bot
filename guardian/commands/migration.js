const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { exportGuild, importGuild } = require('../../helpers/guildExporter');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('migration')
		.setDescription('Gestion des migrations de serveur')
		.addSubcommand(subcommand =>
			subcommand
				.setName('exporter')
				.setDescription('Exporte le serveur actuel')
				.addStringOption(option =>
					option.setName('format')
						.setDescription('Format d\'exportation (json, base64)')
						.setRequired(false)
						.addChoices(
							{ name: 'JSON', value: 'json' },
							{ name: 'Base64', value: 'base64' }
						)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('importer')
				.setDescription('Importe un serveur depuis un snapshot')
				.addStringOption(option =>
					option.setName('snapshot')
						.setDescription('Snapshot à importer')
						.setRequired(true))),
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();
		
		if (subcommand === 'exporter') {
			// Vérification que l'utilisateur est le propriétaire du bot
			if (interaction.user.id !== process.env.OWNER_ID) {
				return await interaction.reply({
					content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.',
					ephemeral: true
				});
			}
			
			const format = interaction.options.getString('format') || 'json';
			
			try {
				const snapshot = await exportGuild(interaction.guild, format);
				
				const embed = new EmbedBuilder()
					.setTitle('💾 Export terminé')
					.setDescription(`Voici le snapshot de \`${interaction.guild.name}\``)
					.setColor('#00ff00');
				
				if (format === 'json') {
					await interaction.reply({
						embeds: [embed],
						files: [{
							name: 'snapshot.json',
							attachment: Buffer.from(snapshot, 'utf-8')
						}]
					});
				} else {
					await interaction.reply({
						embeds: [embed],
						content: `\`\`\`json\n${snapshot}\n\`\`\``
					});
				}
			} catch (error) {
				console.error('Erreur lors de l\'export:', error);
				await interaction.reply({
					content: '❌ Une erreur est survenue lors de l\'export.',
					ephemeral: true
				});
			}
		} else if (subcommand === 'importer') {
			// Vérification que l'utilisateur est le propriétaire du bot
			if (interaction.user.id !== process.env.OWNER_ID) {
				return await interaction.reply({
					content: '❌ Vous n\'avez pas la permission d\'utiliser cette commande.',
					ephemeral: true
				});
			}
			
			const snapshot = interaction.options.getString('snapshot');
			
			try {
				await importGuild(interaction.guild, snapshot);
				
				const embed = new EmbedBuilder()
					.setTitle('✅ Import terminé')
					.setDescription(`Le serveur \`${interaction.guild.name}\` a été mis à jour avec le snapshot.`)
					.setColor('#00ff00');
				
				await interaction.reply({ embeds: [embed] });
			} catch (error) {
				console.error('Erreur lors de l\'import:', error);
				await interaction.reply({
					content: '❌ Une erreur est survenue lors de l\'import.',
					ephemeral: true
				});
			}
		}
	},
};
