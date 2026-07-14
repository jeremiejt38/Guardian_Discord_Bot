const { Events } = require('discord.js');
const { i18n } = require('../utils/i18n');

module.exports = {
  name: Events.ClientReady,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Vérification des permissions au démarrage
    await checkPermissions(client);
  },
};

async function checkPermissions(client) {
  const adminId = process.env.BOT_ADMIN_ID;
  if (!adminId) {
    console.error('BOT_ADMIN_ID not set in environment variables');
    return;
  }

  const guilds = client.guilds.cache;
  
  for (const guild of guilds.values()) {
    const me = guild.members.me;
    if (!me) continue;
    
    const missingPermissions = [];
    
    // Vérifier ManageChannels
    if (!me.permissions.has('ManageChannels')) {
      missingPermissions.push(i18n.__('permissionsStartup.manageChannels'));
    }
    
    // Vérifier ManageRoles
    if (!me.permissions.has('ManageRoles')) {
      missingPermissions.push(i18n.__('permissionsStartup.manageRoles'));
    }
    
    if (missingPermissions.length > 0) {
      try {
        const admin = await client.users.fetch(adminId);
        await admin.send(
          i18n.__('permissionsStartup.missingPermissionsDM', {
            guildName: guild.name,
            missingPermissions: missingPermissions.join(', ')
          })
        );
      } catch (error) {
        console.error(`Failed to send DM to admin for guild ${guild.name}:`, error);
      }
    }
  }
}
