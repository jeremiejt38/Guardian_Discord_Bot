const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { GRADE_NAMES } = require('../../config');
const { getGradeMappings } = require('./gradeMapping');
const logger = require('../logs/logger');

const CATEGORY_NAMES = Object.freeze({
  information: 'informations',
  communaute: 'communaute',
  vocaux: 'vocaux',
  moderation: 'moderation',
  configuration: 'configuration',
  setup: 'guardian-setup'
});

const CHANNEL_NAMES = Object.freeze({
  setup: 'setup',
  rules: 'regles',
  announcements: 'annonces',
  welcome: 'bienvenue',
  faq: 'faq',
  status: 'statut-bot',
  general: 'general',
  gameUpdates: 'game-updates',
  suggestions: 'suggestions',
  serverList: 'liste-serveurs',
  voiceCreate: 'créer-un-channel',
  generalVoice: 'General',
  afkVoice: 'AFK',
  staffGeneral: 'general-staff',
  requests: 'demandes',
  logsMod: 'logs-mod',
  sanctions: 'sanctions',
  reports: 'rapports',
  mesChannels: 'mes-channels',
  maGamelist: 'ma-gamelist',
  bot: 'bot',
  jeuxServeur: 'jeux-serveur',
  membres: 'membres',
  channels: 'channels',
  vocaux: 'vocaux',
  jeux: 'jeux',
  changelogs: 'changelogs',
  suggestionsConfig: 'suggestions-config',
  annoncesConfig: 'annonces-config',
  faqConfig: 'faq-config',
  serveursJeu: 'serveurs-jeu',
  gestionServeurs: 'gestion-serveurs',
  guardian: 'guardian',
  comportement: 'comportement',
  autoModeration: 'auto-moderation',
  roles: 'roles',
  logsConfig: 'logs-config'
});

const GRADE_ORDER = Object.freeze([
  GRADE_NAMES.invite,
  GRADE_NAMES.membre,
  GRADE_NAMES.moderateur,
  GRADE_NAMES.manager,
  GRADE_NAMES.owner
]);

function allowedGradesFrom(minGrade) {
  const index = GRADE_ORDER.indexOf(minGrade);
  return index >= 0 ? GRADE_ORDER.slice(index) : [];
}

function hasGradeOrAbove(grade, thresholdGrade) {
  const gradeIndex = GRADE_ORDER.indexOf(grade);
  const thresholdIndex = GRADE_ORDER.indexOf(thresholdGrade);
  if (gradeIndex < 0 || thresholdIndex < 0) {
    return false;
  }

  return gradeIndex >= thresholdIndex;
}

function buildOverwrites(guild, gradeMappings, policy) {
  const everyone = {
    id: guild.roles.everyone.id,
    deny: [PermissionFlagsBits.ViewChannel]
  };

  const roleOverwrites = allowedGradesFrom(policy.minGrade)
    .map((grade) => {
      const roleId = gradeMappings[grade];
      if (!roleId) {
        return null;
      }

      const allow = [];
      const deny = [];

      if (policy.read) {
        allow.push(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory);
      }

      const canSend = Boolean(policy.send) || (policy.sendFromGrade && hasGradeOrAbove(grade, policy.sendFromGrade));
      if (canSend) {
        allow.push(PermissionFlagsBits.SendMessages);
      } else if (policy.read) {
        deny.push(PermissionFlagsBits.SendMessages);
      }

      if (policy.connect) {
        allow.push(PermissionFlagsBits.Connect);
      }
      if (policy.speak) {
        allow.push(PermissionFlagsBits.Speak);
      }

      return { id: roleId, allow, deny };
    })
    .filter(Boolean);

  return [everyone, ...roleOverwrites];
}

async function setCategoryPermissions(guild, gradeMappings, categoryName, policy) {
  const category = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
  );
  if (!category) {
    return;
  }

  await category.permissionOverwrites.set(buildOverwrites(guild, gradeMappings, policy)).catch((error) => {
    logger.error(`Failed permission overwrite for category ${categoryName}`, error);
  });
}

async function setChannelPermissions(guild, gradeMappings, channelName, policy) {
  const channel = guild.channels.cache.find(
    (item) => item.name === channelName && item.type !== ChannelType.GuildCategory
  );
  if (!channel) {
    return;
  }

  await channel.permissionOverwrites.set(buildOverwrites(guild, gradeMappings, policy)).catch((error) => {
    logger.error(`Failed permission overwrite for channel ${channelName}`, error);
  });
}

async function applyGuardianPermissions(guild) {
  const gradeMappings = getGradeMappings(guild.id);

  if (!gradeMappings[GRADE_NAMES.invite] || !gradeMappings[GRADE_NAMES.owner]) {
    logger.warn('Skipping permission application: grade mappings incomplete');
    return;
  }

  await setCategoryPermissions(guild, gradeMappings, CATEGORY_NAMES.information, {
    minGrade: GRADE_NAMES.invite,
    read: true,
    send: false
  });
  await setCategoryPermissions(guild, gradeMappings, CATEGORY_NAMES.communaute, {
    minGrade: GRADE_NAMES.membre,
    read: true,
    send: true
  });
  await setCategoryPermissions(guild, gradeMappings, CATEGORY_NAMES.vocaux, {
    minGrade: GRADE_NAMES.membre,
    read: true,
    connect: true,
    speak: true
  });
  await setCategoryPermissions(guild, gradeMappings, CATEGORY_NAMES.moderation, {
    minGrade: GRADE_NAMES.moderateur,
    read: true,
    send: true,
    connect: true,
    speak: true
  });
  await setCategoryPermissions(guild, gradeMappings, CATEGORY_NAMES.configuration, {
    minGrade: GRADE_NAMES.membre,
    read: true,
    send: true
  });

  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.rules, {
    minGrade: GRADE_NAMES.invite,
    read: true,
    send: false
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.announcements, {
    minGrade: GRADE_NAMES.invite,
    read: true,
    sendFromGrade: GRADE_NAMES.manager
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.welcome, {
    minGrade: GRADE_NAMES.invite,
    read: true,
    send: false
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.faq, {
    minGrade: GRADE_NAMES.invite,
    read: true,
    sendFromGrade: GRADE_NAMES.manager
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.status, {
    minGrade: GRADE_NAMES.invite,
    read: true,
    send: false
  });

  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.general, {
    minGrade: GRADE_NAMES.invite,
    read: true,
    sendFromGrade: GRADE_NAMES.membre
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.gameUpdates, {
    minGrade: GRADE_NAMES.membre,
    read: true,
    send: false
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.suggestions, {
    minGrade: GRADE_NAMES.membre,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.serverList, {
    minGrade: GRADE_NAMES.membre,
    read: true,
    send: false
  });

  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.voiceCreate, {
    minGrade: GRADE_NAMES.membre,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.generalVoice, {
    minGrade: GRADE_NAMES.invite,
    read: true,
    connect: true,
    speak: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.afkVoice, {
    minGrade: GRADE_NAMES.invite,
    read: true,
    connect: true,
    speak: true
  });

  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.staffGeneral, {
    minGrade: GRADE_NAMES.moderateur,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.requests, {
    minGrade: GRADE_NAMES.moderateur,
    read: true,
    send: false
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.logsMod, {
    minGrade: GRADE_NAMES.moderateur,
    read: true,
    send: false
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.sanctions, {
    minGrade: GRADE_NAMES.moderateur,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.reports, {
    minGrade: GRADE_NAMES.moderateur,
    read: true,
    send: false
  });

  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.mesChannels, {
    minGrade: GRADE_NAMES.membre,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.maGamelist, {
    minGrade: GRADE_NAMES.membre,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.bot, {
    minGrade: GRADE_NAMES.moderateur,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.jeuxServeur, {
    minGrade: GRADE_NAMES.moderateur,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.membres, {
    minGrade: GRADE_NAMES.manager,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.channels, {
    minGrade: GRADE_NAMES.manager,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.vocaux, {
    minGrade: GRADE_NAMES.manager,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.jeux, {
    minGrade: GRADE_NAMES.manager,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.changelogs, {
    minGrade: GRADE_NAMES.manager,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.suggestionsConfig, {
    minGrade: GRADE_NAMES.manager,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.annoncesConfig, {
    minGrade: GRADE_NAMES.manager,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.faqConfig, {
    minGrade: GRADE_NAMES.manager,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.serveursJeu, {
    minGrade: GRADE_NAMES.manager,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.gestionServeurs, {
    minGrade: GRADE_NAMES.manager,
    read: true,
    send: false
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.guardian, {
    minGrade: GRADE_NAMES.owner,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.comportement, {
    minGrade: GRADE_NAMES.owner,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.autoModeration, {
    minGrade: GRADE_NAMES.owner,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.roles, {
    minGrade: GRADE_NAMES.owner,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.logsConfig, {
    minGrade: GRADE_NAMES.owner,
    read: true,
    send: false
  });

  await setCategoryPermissions(guild, gradeMappings, CATEGORY_NAMES.setup, {
    minGrade: GRADE_NAMES.owner,
    read: true,
    send: true
  });
  await setChannelPermissions(guild, gradeMappings, CHANNEL_NAMES.setup, {
    minGrade: GRADE_NAMES.owner,
    read: true,
    send: true
  });
}

module.exports = {
  applyGuardianPermissions
};
