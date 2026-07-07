const { handleNewMember } = require('../modules/members/newMember');
const { logToChannel } = require('../modules/config/configLogger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    await handleNewMember(member);
    logToChannel(member.guild, 'member', `<@${member.id}> (**${member.user.tag}**) a rejoint le serveur`).catch(() => {});
  }
};
