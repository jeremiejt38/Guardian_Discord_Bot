#!/usr/bin/env node
/**
 * Script temporaire : ré-exécute runSetupInstallationPhases sur un guild existant.
 * Usage: node scripts/rerun-setup.js <guildId>
 */
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { initDatabase, migrateDatabase } = require('../database/db');

const guildId = process.argv[2];
if (!guildId) { console.error('Usage: node scripts/rerun-setup.js <guildId>'); process.exit(1); }

initDatabase();
migrateDatabase();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ]
});

client.once('ready', async () => {
  console.log(`Connected as ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    await guild.members.fetch().catch(() => {});
    console.log(`Guild: ${guild.name}`);
    const { completeGuildSetup } = require('../modules/initialisation/setup');
    await completeGuildSetup(guild);
    console.log('Setup complete.');
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
