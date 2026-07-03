const { evaluateSpam } = require('../modules/moderation/autoMod');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (!message.guild || message.author.bot) {
      return;
    }

    const spamDetected = await evaluateSpam(message);
    if (spamDetected) {
      await message.delete().catch(() => undefined);
      await message.channel.send({ content: `${message.author}, ralentis svp.` }).catch(() => undefined);
    }
  }
};
