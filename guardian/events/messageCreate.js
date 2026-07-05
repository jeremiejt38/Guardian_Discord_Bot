const { evaluateSpam, evaluateBlacklist } = require('../modules/moderation/autoMod');
const { getGuildSetting } = require('../modules/config/settings');
const { t } = require('../modules/i18n');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (!message.guild || message.author.bot) {
      return;
    }

    const spamDetected = evaluateSpam(message);
    const blacklistDetected = evaluateBlacklist(message);

    if (spamDetected) {
      await message.delete().catch(() => undefined);
      await message.channel.send({
        content: t(message.guild.id, 'messageCreate.slowDown', { user: message.author.toString() })
      }).catch(() => undefined);
    } else if (blacklistDetected) {
      await message.delete().catch(() => undefined);
      const blacklistMode = getGuildSetting(message.guild.id, 'automod', 'blacklist_mode', 'silent');
      if (blacklistMode === 'warn') {
        await message.channel.send({
          content: t(message.guild.id, 'messageCreate.forbiddenWord', { user: message.author.toString() })
        }).catch(() => undefined);
      }
    }
  }
};
