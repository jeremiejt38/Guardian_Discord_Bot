import { checkMissingPermissions } from '../modules/admin/permissionStartupCheck.js';

export default async function ready(client) {
    console.log(`Connecté en tant que ${client.user.tag}!`);
    
    // Vérifier les permissions au démarrage
    await checkMissingPermissions(client);
}
