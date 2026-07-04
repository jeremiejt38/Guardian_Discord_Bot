function replyEphemeral(interaction, content) {
  return interaction.reply({ content, ephemeral: true });
}

module.exports = { replyEphemeral };
