const logger = require('../modules/logs/logger');
const { alertGuildLeave } = require('../modules/admin/adminAlerts');

module.exports = {
  name: 'guildDelete',
  once: false,
  async execute(client, guild) {
    logger.info(`Bot removed from guild: ${guild.name} (${guild.id})`);
    await alertGuildLeave(guild).catch(() => {});
  }
};
