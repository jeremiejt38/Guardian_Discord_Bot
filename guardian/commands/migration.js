const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { exportGuildData, encodeSnapshot, decodeSnapshot } = require('../modules/migration/guildExport');
const { importGuildData, validateSnapshot } = require('../modules/migration/guildImport');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('migration')
    .setDescription('Exporter ou importer les données du serveur')
    .addSubcommand((sub) =>
      sub
        .setName('exporter')
        .setDescription('Exporter les données de ce serveur pour migration')
    )
    .addSubcommand((sub) =>
      sub
        .setName('importer')
        .setDescription('Importer un snapshot dans ce serveur')
        .addStringOption((option) =>
          option
            .setName('snapshot')
            .setDescription('Le snapshot encodé à importer')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'Cette commande est réservée aux administrateurs du serveur.',
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'exporter') {
        await interaction.deferReply({ ephemeral: true });

        const snapshot = exportGuildData(interaction.guildId);
        const encoded = encodeSnapshot(snapshot);

        const buffer = Buffer.from(encoded, 'utf8');
        await interaction.editReply({
          content: `Snapshot exporté : **${Object.keys(snapshot.tables).length} tables**, version ${snapshot.version}. Garde ce fichier précieusement.`,
          files: [
            {
              attachment: buffer,
              name: `guardian-migration-${interaction.guildId}.txt`
            }
          ]
        });
        return;
      }

      if (subcommand === 'importer') {
        await interaction.deferReply({ ephemeral: true });

        const raw = interaction.options.getString('snapshot', true).trim();
        let snapshot;
        try {
          snapshot = decodeSnapshot(raw);
        } catch {
          snapshot = null;
        }

        if (!snapshot) {
          try {
            snapshot = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
          } catch {
            snapshot = null;
          }
        }

        if (!snapshot || !validateSnapshot(snapshot)) {
          await interaction.editReply({
            content: 'Snapshot invalide. Colle le contenu exact du fichier exporté.',
            ephemeral: true
          });
          return;
        }

        if (snapshot.originalGuildId === interaction.guildId) {
          await interaction.editReply({
            content: 'Tu ne peux pas importer un snapshot dans le même serveur source.',
            ephemeral: true
          });
          return;
        }

        const result = importGuildData(snapshot, interaction.guildId, { deleteExisting: true });

        const summary = Object.entries(result.importedTables)
          .map(([table, count]) => `- ${table}: ${count} lignes`)
          .join('\n');

        await interaction.editReply({
          content: [
            `Importation terminée : **${result.totalRows} lignes** importées.`,
            'Rappel : les IDs Discord (salons, rôles, messages) ne sont pas migrés. Pense à refaire le setup sur ce serveur si nécessaire.',
            '```',
            summary || 'Aucune donnée',
            '```'
          ].join('\n'),
          ephemeral: true
        });
      }
    } catch (err) {
      console.error('[migration command]', err);
      await interaction.editReply({
        content: `Erreur lors de l'opération : ${err.message}`,
        ephemeral: true
      });
    }
  }
};
