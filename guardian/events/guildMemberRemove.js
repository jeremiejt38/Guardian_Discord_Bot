const logger = require('../modules/logs/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(client, member) {
    await logger.logToDiscord(member.guild, `Départ du serveur: <@${member.id}>`);
  }
};
