const { evaluateSpam, evaluateBlacklist } = require('../modules/moderation/autoMod');

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
        ? `${message.author}, ralentis svp.`
        : `${message.author}, ce message contient un mot interdit.`;
      await message.channel.send({ content }).catch(() => undefined);
    }
  }
};
