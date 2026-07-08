const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot responsiveness and API latency'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Pinging…', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const ws = interaction.client.ws.ping;
    await interaction.editReply(
      `🏓 **Pong!**\n> Roundtrip: \`${roundtrip}ms\`\n> WebSocket: \`${ws}ms\``
    );
  }
};
