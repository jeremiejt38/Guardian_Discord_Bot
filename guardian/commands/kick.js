const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');
const { sendModLog } = require('../modules/moderation/modLog');
const { t, describe } = require('../modules/i18n');
const { replyEphemeral } = require('../modules/utils/interactions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription(describe('commands.kick.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) => option.setName('membre').setDescription(describe('commands.kick.memberOption')).setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription(describe('commands.kick.reasonOption')).setRequired(true)),
  async execute(interaction) {
    const member = interaction.options.getMember('membre', true);
    const reason = interaction.options.getString('raison', true);

    await member.send(`Tu as été expulsé du serveur. Raison: ${reason}`).catch(() => undefined);

    await member.kick(reason);

    await saveSanction({
      guildId: interaction.guildId,
      userId: member.id,
      type: 'kick',
      reason,
      appliedBy: interaction.user.id,
      auto: 0,
      guild: interaction.guild,
      member
    });

    await sendModLog(interaction.guild, t(interaction.guildId, 'modLog.sanctionLog', { type: 'kick', userId: member.id, appliedBy: interaction.user.id, reason }));

    await replyEphemeral(
      interaction,
      t(interaction.guildId, 'commands.kick.success', { member: member.toString() })
    );
  }
};
