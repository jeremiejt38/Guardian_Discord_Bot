const { applyNitroBoost } = require('../modules/moderation/behavior');
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(client, oldMember, newMember) {
    try {
      const wasBooster = Boolean(oldMember.premiumSince);
      const isBooster = Boolean(newMember.premiumSince);
      if (!wasBooster && isBooster) {
        applyNitroBoost(newMember.guild.id, newMember.id);
        logger.logToDiscord(newMember.guild, `Boost Nitro détecté : <@${newMember.id}> +50 pts score comportement`);
      }
    } catch (error) {
      logger.error('guildMemberUpdate error', error);
    }
  }
};
