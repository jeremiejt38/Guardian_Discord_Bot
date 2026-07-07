const { CHANNELS } = require('../config');
const { saveConfigBackup } = require('../modules/config/configBackup');
const { sendDmNotification } = require('../modules/notifications/dmNotifier');
const { logToChannel } = require('../modules/config/configLogger');
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'channelDelete',
  async execute(client, channel) {
    if (!channel.guild) return;
    if (channel.name !== CHANNELS.guardianBackup) return;

    const guild = channel.guild;
    logger.warn(`Guild ${guild.id}: #guardian-backup supprimé — recréation en cours`);

    try {
      await sendDmNotification(
        guild,
        'setup_incomplete',
        [
          `## ⚠️ Canal de sauvegarde supprimé`,
          ``,
          `Le canal \`#guardian-backup\` de **${guild.name}** a été supprimé.`,
          `Guardian va le recréer automatiquement pour protéger la configuration du serveur.`,
          ``,
          `> Ce canal est nécessaire pour restaurer la config en cas de perte de base de données.`
        ].join('\n')
      );
    } catch (err) {
      logger.warn(`Guild ${guild.id}: failed to send DM alert after #guardian-backup deletion — ${err?.message}`);
    }

    await saveConfigBackup(guild);
    logToChannel(guild, 'backup', `⚠️ \`#${CHANNELS.guardianBackup}\` a été supprimé et recréé automatiquement. Alerte DM envoyée à l'owner.`).catch(() => {});
    logger.info(`Guild ${guild.id}: #guardian-backup recréé après suppression`);
  }
};
