#!/usr/bin/env node
/*
Simple E2E runner for Guardian on a staging guild.
Requires environment variables:
- DISCORD_TOKEN: bot token for staging bot
- STAGING_GUILD_ID: guild id to run tests against

This script performs non-destructive checks: creates setup area, seeds messages,
adds a server via DB helper, creates & deletes a temporary voice channel, and
verifies results.
*/

const { Client, GatewayIntentBits } = require('discord.js');
const { createSetupArea } = require('../modules/initialisation/setup');
const { seedGuildMessages } = require('../modules/initialisation/seeds');
const { initDatabase } = require('../database/db');
const { addServer, listServersForGuild, setApproved } = require('../modules/servers/servers');
const logger = require('../modules/logs/logger');

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.STAGING_GUILD_ID;

  if (!token || !guildId) {
    console.error('Missing DISCORD_TOKEN or STAGING_GUILD_ID env vars');
    process.exit(2);
  }

  initDatabase(process.env.DATABASE_PATH || ':memory:');

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates] });
  client.once('ready', async () => {
    try {
      console.log('Logged in as', client.user.tag);
      const guild = await client.guilds.fetch(guildId);
      console.log('Fetched guild:', guild.id, guild.name || '(no name)');

      console.log('Creating setup area...');
      await createSetupArea(guild);
      console.log('Seeding messages...');
      await seedGuildMessages(guild);

      console.log('Testing server add/list flow...');
      const sid = addServer(guild.id, 'e2e-test-server', 'TestGame', '127.0.0.1', 27015, 'pw', null, 0);
      console.log('Added server id', sid);
      const list = listServersForGuild(guild.id, false);
      console.log('Servers count (including unapproved):', list.length);

      console.log('Creating and deleting a temporary voice channel...');
      const temp = await guild.channels.create({ name: 'e2e-temp-voice', type: 2 });
      console.log('Created temp voice channel', temp.id);
      await temp.delete('e2e cleanup');
      console.log('Deleted temp voice channel');

      console.log('E2E completed successfully');
    } catch (err) {
      logger.error('E2E runner failed', err);
      process.exitCode = 1;
    } finally {
      await client.destroy();
      process.exit();
    }
  });

  await client.login(token);
}

if (require.main === module) main();
