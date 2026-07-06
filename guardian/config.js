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
  informations: '📋 Informations',
  communaute: '🌐 Communauté',
  vocaux: '🔊 Salons Vocaux',
  moderation: '🛡️ Modération',
  configuration: '⚙️ Configuration'
});

const CHANNELS = Object.freeze({
  setup: 'setup',
  welcome: 'bienvenue',
  rules: 'regles',
  faq: 'faq',
  requests: 'demandes',
  general: 'general',
  voiceGeneral: 'general-vocal',
  voiceAfk: 'afk',
  reports: 'signalements',
  autoModeration: 'auto-moderation',
  behavior: 'comportement',
  guardian: 'guardian',
  roles: 'roles',
  moderationLogs: 'logs-mod',
  gameChannels: 'mes-channels',
  gameList: 'ma-gamelist',
  voiceCreate: 'creer-channel',
  serverList: 'liste-serveurs',
  serverManagement: 'gestion-serveurs',
  configLogs: 'guardian-logs',
  botConfig: 'bot',
  membres: 'membres',
  channelsConfig: 'channels',
  vocauxConfig: 'vocaux',
  jeux: 'jeux',
  suggestions: 'suggestions',
  annonces: 'annonces',
  serveurs: 'serveurs'
});

const CHANNEL_NAMES = Object.freeze({
  setupCategory: CATEGORIES.setup,
  setupChannel: CHANNELS.setup,
  welcome: CHANNELS.welcome,
  rules: CHANNELS.rules,
  faq: CHANNELS.faq,
  requests: CHANNELS.requests,
  general: CHANNELS.general,
  voiceGeneral: CHANNELS.voiceGeneral,
  voiceAfk: CHANNELS.voiceAfk,
  reports: CHANNELS.reports,
  autoModeration: CHANNELS.autoModeration,
  behavior: CHANNELS.behavior,
  guardian: CHANNELS.guardian,
  roles: CHANNELS.roles,
  moderationLogs: CHANNELS.moderationLogs,
  gameChannels: CHANNELS.gameChannels,
  gameList: CHANNELS.gameList,
  voiceCreate: CHANNELS.voiceCreate,
  serverList: CHANNELS.serverList,
  serverManagement: CHANNELS.serverManagement,
  configLogs: CHANNELS.configLogs,
  botConfig: CHANNELS.botConfig,
  membres: CHANNELS.membres,
  channelsConfig: CHANNELS.channelsConfig,
  vocauxConfig: CHANNELS.vocauxConfig,
  jeux: CHANNELS.jeux,
  suggestions: CHANNELS.suggestions,
  annonces: CHANNELS.annonces,
  serveurs: CHANNELS.serveurs
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
