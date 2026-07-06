const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { saveSanction } = require('../modules/moderation/moderation');
const { sendModLog } = require('../modules/moderation/modLog');
const { t, describe } = require('../modules/i18n');
const { replyEphemeral } = require('../modules/utils/interactions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription(describe('commands.ban.description'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) => option.setName('membre').setDescription(describe('commands.ban.memberOption')).setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription(describe('commands.ban.reasonOption')).setRequired(true)),
  async execute(interaction) {
    const member = interaction.options.getMember('membre', true);
    const reason = interaction.options.getString('raison', true);

    await member.send(`Tu as été banni du serveur. Raison: ${reason}`).catch(() => undefined);

    await member.ban({ reason });

    await saveSanction({
      guildId: interaction.guildId,
      userId: member.id,
      type: 'ban',
      reason,
      appliedBy: interaction.user.id,
      auto: 0,
      guild: interaction.guild,
      member
    });

    await sendModLog(interaction.guild, t(interaction.guildId, 'modLog.sanctionLog', { type: 'ban', userId: member.id, appliedBy: interaction.user.id, reason }));

    await replyEphemeral(
      interaction,
      t(interaction.guildId, 'commands.ban.success', { memberTag: member.user.tag })
    );
  }
};
