const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { addServer } = require('./servers');
const { t } = require('../i18n');

async function handleAddServerButton(interaction) {
  const modal = new ModalBuilder().setCustomId('servers:add:modal').setTitle('Ajouter un serveur');

  const name = new TextInputBuilder().setCustomId('server_name').setLabel('Nom du serveur').setStyle(TextInputStyle.Short).setRequired(true);
  const game = new TextInputBuilder().setCustomId('server_game').setLabel('Nom du jeu').setStyle(TextInputStyle.Short).setRequired(true);
  const ip = new TextInputBuilder().setCustomId('server_ip').setLabel('IP ou URL').setStyle(TextInputStyle.Short).setRequired(true);
  const port = new TextInputBuilder().setCustomId('server_port').setLabel('Port').setStyle(TextInputStyle.Short).setRequired(true);
  const pwd = new TextInputBuilder().setCustomId('server_pwd').setLabel('Mot de passe (optionnel)').setStyle(TextInputStyle.Short).setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(name),
    new ActionRowBuilder().addComponents(game),
    new ActionRowBuilder().addComponents(ip),
    new ActionRowBuilder().addComponents(port),
    new ActionRowBuilder().addComponents(pwd)
  );

  await interaction.showModal(modal);
}

async function handleServerModalSubmit(interaction) {
  const guildId = interaction.guildId;
  const name = interaction.fields.getTextInputValue('server_name');
  const game = interaction.fields.getTextInputValue('server_game');
  const ip = interaction.fields.getTextInputValue('server_ip');
  const port = interaction.fields.getTextInputValue('server_port');
  const pwd = interaction.fields.getTextInputValue('server_pwd');

  addServer(guildId, name, game, ip, Number(port), pwd || null);

  await interaction.reply({ content: t(guildId, 'init.serverAdded', { name }), ephemeral: true });
}

module.exports = { handleAddServerButton, handleServerModalSubmit };
