const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction, parseDurationToMs } = require('../modules/moderation/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre à mute').setRequired(true))
    .addStringOption((option) => option.setName('duree').setDescription('Durée ex: 1h').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Raison').setRequired(true)),
  async execute(interaction) {
    const member = interaction.options.getMember('membre', true);
    const reason = interaction.options.getString('raison', true);
    const duration = interaction.options.getString('duree', true);
    const durationMs = parseDurationToMs(duration);

    if (!durationMs) {
      await interaction.reply({ content: 'Durée invalide. Utilise par exemple 30m, 1h ou 1d.', ephemeral: true });
      return;
    }

    await member.timeout(durationMs, reason).catch(() => undefined);

    await saveSanction({
      guildId: interaction.guildId,
      userId: member.id,
      type: 'mute',
      reason,
      duration,
      appliedBy: interaction.user.id,
      auto: 0,
      guild: interaction.guild,
      member
    });

    await member.send(`Tu as été mute pour ${duration}. Raison: ${reason}`).catch(() => undefined);

    await interaction.reply({ content: `Mute enregistré pour ${member}.`, ephemeral: true });
  }
};
