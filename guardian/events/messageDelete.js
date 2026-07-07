const { saveConfigBackup, BACKUP_MARKER, BACKUP_CHANNEL_NAME } = require('../modules/config/configBackup');
const { sendDmNotification } = require('../modules/notifications/dmNotifier');
const { logToChannel } = require('../modules/config/configLogger');
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'messageDelete',
  async execute(client, message) {
    if (!message.guild) return;
    if (message.channel?.name !== BACKUP_CHANNEL_NAME) return;
    if (message.author?.id !== client.user?.id) return;
    if (!message.content?.includes(BACKUP_MARKER)) return;

    const guild = message.guild;
    logger.warn(`Guild ${guild.id}: message backup supprimé dans #${BACKUP_CHANNEL_NAME} — recréation en cours`);

    try {
      await sendDmNotification(
        guild,
        'setup_incomplete',
        [
          `## ⚠️ Message de sauvegarde supprimé`,
          ``,
          `Le message de configuration Guardian dans \`#${BACKUP_CHANNEL_NAME}\` de **${guild.name}** a été supprimé.`,
          `Guardian va le recréer automatiquement pour protéger la configuration du serveur.`,
          ``,
          `> Ce message contient la sauvegarde de toute la config. Sa suppression est une action à risque.`
        ].join('\n')
      );
    } catch (err) {
      logger.warn(`Guild ${guild.id}: failed to send DM alert after backup message deletion — ${err?.message}`);
    }

    await saveConfigBackup(guild);
    logToChannel(guild, 'backup', `⚠️ Le message de sauvegarde dans \`#${BACKUP_CHANNEL_NAME}\` a été supprimé et recréé automatiquement.`).catch(() => {});
    logger.info(`Guild ${guild.id}: message backup recréé dans #${BACKUP_CHANNEL_NAME} après suppression`);
  }
};
