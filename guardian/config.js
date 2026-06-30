const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

const TOKENS_BY_ENV = Object.freeze({
  production: process.env.DISCORD_TOKEN_PRODUCTION || process.env.DISCORD_TOKEN,
  development: process.env.DISCORD_TOKEN_DEVELOPMENT || process.env.DISCORD_TOKEN,
  test: process.env.DISCORD_TOKEN_TEST || process.env.DISCORD_TOKEN
});

const DISCORD_TOKEN = TOKENS_BY_ENV[NODE_ENV];

const CHANNEL_NAMES = Object.freeze({
  setupCategory: 'guardian-setup',
  setupChannel: 'setup',
  welcome: 'bienvenue',
  requests: 'demandes',
  moderationLogs: 'logs-mod',
  gameUpdates: 'game-updates',
  gameChannels: 'mes-channels',
  gameList: 'ma-gamelist',
  voiceCreate: 'créer-un-channel',
  serverList: 'liste-serveurs',
  configLogs: 'logs-config'
});

const GRADE_NAMES = Object.freeze({
  invite: 'invite',
  membre: 'membre',
  moderateur: 'moderateur',
  manager: 'manager',
  owner: 'owner'
});

function assertDiscordTokenConfigured() {
  if (!DISCORD_TOKEN) {
    throw new Error(`No Discord token configured for NODE_ENV=${NODE_ENV}`);
  }
}

module.exports = {
  NODE_ENV,
  DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  DATABASE_PATH: path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/guardian.db'),
  CHANNEL_NAMES,
  GRADE_NAMES,
  assertDiscordTokenConfigured
};
