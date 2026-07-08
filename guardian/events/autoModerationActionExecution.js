const { saveSanction } = require('../modules/moderation/moderation');
const { sendModLog } = require('../modules/moderation/modLog');
const { incrementBehaviorScore } = require('../modules/moderation/behavior');
const { checkBehaviorThresholds } = require('../modules/moderation/behavior');
const { getGuildSetting } = require('../modules/config/settings');
const logger = require('../modules/logs/logger');

const ACTION_TYPE = Object.freeze({
  BLOCK_MESSAGE: 1,
  SEND_ALERT_MESSAGE: 2,
  TIMEOUT: 3
});

const PENALTY_MAP = Object.freeze({
  [ACTION_TYPE.BLOCK_MESSAGE]: -10,
  [ACTION_TYPE.SEND_ALERT_MESSAGE]: -5,
  [ACTION_TYPE.TIMEOUT]: -20
});

module.exports = {
  name: 'autoModerationActionExecution',
  async execute(client, autoModerationActionExecution) {
    try {
      const { guildId, userId, action, ruleTriggerType, matchedContent, channel } = autoModerationActionExecution;

      if (!guildId || !userId) return;

      const enabled = getGuildSetting(guildId, 'automod', 'discord_automod_score_enabled', true);
      if (!enabled) return;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      const penalty = PENALTY_MAP[action?.type] ?? -5;

      saveSanction({
        guildId,
        userId,
        type: 'warn',
        reason: `Discord AutoMod (règle type ${ruleTriggerType})${matchedContent ? ` — "${String(matchedContent).slice(0, 80)}"` : ''}`,
        appliedBy: client.user.id,
        auto: 1
      });

      if (penalty !== 1) {
        incrementBehaviorScore(guildId, userId, penalty - 1);
      }

      await checkBehaviorThresholds(guild, userId).catch(() => {});

      const channelMention = channel ? `<#${channel.id}>` : '(canal inconnu)';
      await sendModLog(
        guild,
        `🤖 **Discord AutoMod** a agi sur <@${userId}> dans ${channelMention}\n> Règle type \`${ruleTriggerType}\` — action \`${action?.type}\` — score **${penalty}**`
      ).catch(() => {});

      logger.info(`autoModerationActionExecution: guild=${guildId} user=${userId} action=${action?.type} penalty=${penalty}`);
    } catch (err) {
      logger.error('autoModerationActionExecution handler error', err);
    }
  }
};
