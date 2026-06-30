const { handleNewMember } = require('../modules/members/newMember');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    await handleNewMember(member);
  }
};
