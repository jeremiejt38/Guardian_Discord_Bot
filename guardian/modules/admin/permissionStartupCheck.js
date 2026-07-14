const logger = require('../logs/logger');
const { getBotAdminId } = require('./botUpdater');

const REQUIRED_PERMISSIONS = ['ManageChannels', 'ManageRoles'];

function getMissingPermissions(guild) {
  const me = guild.members?.me;
  if (!me) return REQUIRED_PERMISSIONS;
  return REQUIRED_PERMISSIONS.filter((perm) => !me.permissions.has(perm));
}

async function notifyMissingPermissions(client, guild, missing) {
  const adminId = getBotAdminId();
  if (!adminId) return;
  try {
    const user = await client.users.fetch(adminId);
    const lines = [
      `⚠️ **Guardian — permissions manquantes sur ${guild.name}**`,
      '',
      `Le bot n'a pas les permissions suivantes sur **${guild.name}** :`,
      ...missing.map((p) => `- **${p}**`),
      '',
      'Certaines fonctionnalités (création de channels, gestion des grades) risquent de ne pas fonctionner.',
      'Vérifiez le rôle du bot et les autorisations du serveur.',
    ];
    await user.send(lines.join('\n'));
  } catch (err) {
    logger.warn(`permissionStartupCheck: could not notify admin about ${guild.id}`, err.message);
  }
}

async function checkMissingPermissions(client) {
  if (!client?.guilds?.cache) return;
  const adminId = getBotAdminId();
  if (!adminId) return;

  for (const guild of client.guilds.cache.values()) {
    try {
      if (!guild.members?.me) {
        await guild.members.fetch({ user: client.user.id, force: true }).catch(() => {});
      }
      const missing = getMissingPermissions(guild);
      if (missing.length > 0) {
        logger.warn(`[permissionStartupCheck] guild ${guild.id} missing ${missing.join(', ')}`);
        await notifyMissingPermissions(client, guild, missing);
      }
    } catch (err) {
      logger.warn(`[permissionStartupCheck] failed for guild ${guild.id}`, err);
    }
  }
}

module.exports = {
  checkMissingPermissions,
  getMissingPermissions,
};
