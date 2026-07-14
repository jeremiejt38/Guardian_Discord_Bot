const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ... (le reste du fichier reste inchangé)

const commands = [
  // ... autres commandes ...
  require('./commands/setupResume'),
  // ... autres commandes ...
];

// ... (le reste du fichier reste inchangé)
