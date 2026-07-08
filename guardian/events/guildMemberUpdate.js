const { applyNitroBoost } = require('../modules/moderation/behavior');
const { markRulesAccepted } = require('../modules/members/rulesAcceptance');
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

      const wasPending = Boolean(oldMember.pending);
      const isPending = Boolean(newMember.pending);
      if (wasPending && !isPending) {
        markRulesAccepted(newMember.guild.id, newMember.id);
        logger.info(`guildMemberUpdate: rules accepted via Membership Screening — guild=${newMember.guild.id} user=${newMember.id}`);
      }
    } catch (error) {
      logger.error('guildMemberUpdate error', error);
    }
  }
};
