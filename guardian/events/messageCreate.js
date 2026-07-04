const { evaluateSpam, evaluateBlacklist } = require('../modules/moderation/autoMod');
const { t } = require('../modules/i18n');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (!message.guild || message.author.bot) {
      return;
    }

    const spamDetected = evaluateSpam(message);
    const blacklistDetected = evaluateBlacklist(message);

    if (spamDetected || blacklistDetected) {
      await message.delete().catch(() => undefined);
      const content = spamDetected
        ? t(message.guild.id, 'messageCreate.slowDown', { user: message.author.toString() })
        : t(message.guild.id, 'messageCreate.forbiddenWord', { user: message.author.toString() });
      await message.channel.send({ content }).catch(() => undefined);
    }
  }
};
