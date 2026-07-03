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

if (!DISCORD_TOKEN) {
  throw new Error(`No Discord token configured for NODE_ENV=${NODE_ENV}`);
}

const CATEGORIES = Object.freeze({
  setup: 'guardian-setup',
  informations: 'informations',
  communaute: 'communaute',
  vocaux: 'vocaux',
  moderation: 'moderation',
  configuration: 'configuration'
});

const CHANNELS = Object.freeze({
  setup: 'setup',
  welcome: 'bienvenue',
  faq: 'faq',
  requests: 'demandes',
  general: 'general',
  moderationLogs: 'logs-mod',
  gameChannels: 'mes-channels',
  gameList: 'ma-gamelist',
  voiceCreate: 'créer-un-channel',
  serverList: 'liste-serveurs',
  configLogs: 'logs-config'
});

const CHANNEL_NAMES = Object.freeze({
  setupCategory: CATEGORIES.setup,
  setupChannel: CHANNELS.setup,
  welcome: CHANNELS.welcome,
  faq: CHANNELS.faq,
  requests: CHANNELS.requests,
  general: CHANNELS.general,
  moderationLogs: CHANNELS.moderationLogs,
  gameChannels: CHANNELS.gameChannels,
  gameList: CHANNELS.gameList,
  voiceCreate: CHANNELS.voiceCreate,
  serverList: CHANNELS.serverList,
  configLogs: CHANNELS.configLogs
});

const GRADE_NAMES = Object.freeze({
  invite: 'invite',
  membre: 'membre',
  moderateur: 'moderateur',
  manager: 'manager',
  owner: 'owner'
});

module.exports = {
  NODE_ENV,
  DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  DATABASE_PATH: path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/guardian.db'),
  CATEGORIES,
  CHANNELS,
  CHANNEL_NAMES,
  GRADE_NAMES
};
