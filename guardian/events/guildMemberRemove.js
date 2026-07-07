const { logToChannel } = require('../modules/config/configLogger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(client, member) {
    logToChannel(member.guild, 'member', `<@${member.id}> (**${member.user?.tag ?? member.id}**) a quitté le serveur`).catch(() => {});
  }
};
