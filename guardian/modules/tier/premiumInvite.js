const { PermissionFlagsBits } = require('discord.js');

const DEFAULT_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ViewAuditLog,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.CreateInstantInvite,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.UseApplicationCommands
];

function getPremiumClientId() {
  return process.env.PREMIUM_CLIENT_ID || process.env.CLIENT_ID || null;
}

function buildPremiumInviteURL(guildId = null) {
  const clientId = getPremiumClientId();
  if (!clientId) return null;

  const permissions = DEFAULT_PERMISSIONS.reduce((acc, bit) => acc + BigInt(bit), 0n).toString();
  const params = new URLSearchParams({
    client_id: clientId,
    permissions,
    scope: 'bot applications.commands'
  });

  if (guildId) {
    params.set('guild_id', guildId);
    params.set('disable_guild_select', 'true');
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

module.exports = {
  getPremiumClientId,
  buildPremiumInviteURL,
  DEFAULT_PERMISSIONS
};
