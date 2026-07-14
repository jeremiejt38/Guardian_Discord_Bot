const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const { CLIENT_ID, DISCORD_TOKEN } = require('./config');

if (!CLIENT_ID) {
  throw new Error('CLIENT_ID is required for slash command deployment.');
}
if (!DISCORD_TOKEN) {
  throw new Error('DISCORD_TOKEN is required for slash command deployment.');
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath).filter((fileName) => fileName.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command?.data) {
    commands.push(command.data.toJSON());
  }
}

(async () => {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log(`Deployed ${commands.length} commands.`);
})();
