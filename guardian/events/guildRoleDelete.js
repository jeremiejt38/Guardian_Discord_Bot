const { getGradeMappings } = require('../modules/initialisation/gradeMapping');
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'roleDelete',
  async execute(client, role) {
    try {
      const guildId = role.guild.id;
      const mappings = getGradeMappings(guildId);

      const gradeName = Object.entries(mappings).find(([, roleId]) => roleId === role.id)?.[0];
      if (!gradeName) return;

      const guild = role.guild;
      const ownerId = guild.ownerId;
      if (!ownerId) return;

      try {
        const owner = await client.users.fetch(ownerId);
        await owner.send(
          `⚠️ **Guardian — Alerte rôle supprimé**\n\n` +
          `Le rôle Discord associé au grade **${gradeName}** sur le serveur **${guild.name}** vient d'être supprimé.\n` +
          `Guardian ne peut plus fonctionner correctement pour ce grade. Reconfigure le mapping dans \`#guardian\`.`
        );
      } catch {
      }

      logger.logToDiscord(guild, `⚠️ Rôle Guardian supprimé : \`${role.name}\` (grade: ${gradeName}). Reconfiguration requise dans #guardian.`);
    } catch (error) {
      logger.error('guildRoleDelete error', error);
    }
  }
};
