/**
 * Vérifie les permissions manquantes pour chaque serveur du bot au démarrage
 * @param {import('discord.js').Client} client - Le client Discord
 * @returns {Promise<void>}
 */
export async function checkMissingPermissions(client) {
    const adminId = process.env.BOT_ADMIN_ID;
    
    if (!adminId) {
        console.error("BOT_ADMIN_ID non défini dans les variables d'environnement");
        return;
    }
    
    // Récupérer les permissions requises
    const requiredPermissions = ['ManageChannels', 'ManageRoles'];
    
    for (const guild of client.guilds.cache.values()) {
        try {
            const member = await guild.members.fetch(client.user.id);
            
            // Vérifier si le bot a toutes les permissions requises
            const missingPermissions = [];
            
            for (const permission of requiredPermissions) {
                if (!member.permissions.has(permission)) {
                    missingPermissions.push(permission);
                }
            }
            
            // Si des permissions sont manquantes, envoyer un DM à l'admin
            if (missingPermissions.length > 0) {
                const adminUser = await client.users.fetch(adminId);
                await adminUser.send({
                    content: `Le bot ne dispose pas des permissions requises sur le serveur **${guild.name}**.\nPermissions manquantes : ${missingPermissions.join(', ')}`
                });
            }
        } catch (error) {
            console.error(`Erreur lors de la vérification des permissions pour le serveur ${guild.name}:`, error);
        }
    }
}
