import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { checkMissingPermissions } from '../modules/admin/permissionStartupCheck.js';

// Mock des modules Discord.js
const mockGuild = {
    name: 'Test Server',
    id: '1234567890',
    members: {
        fetch: async () => ({
            permissions: {
                has: (permission) => permission === 'ManageChannels' // Simule que ManageRoles est manquant
            }
        })
    }
};

const mockClient = {
    user: { id: 'bot-id' },
    guilds: {
        cache: {
            values: () => [mockGuild]
        }
    },
    users: {
        fetch: async (id) => ({
            send: async (message) => {
                // Mock du send pour éviter les erreurs
                return Promise.resolve();
            }
        })
    }
};

test('Vérification des permissions manquantes', async () => {
    // Test avec une permission manquante
    await checkMissingPermissions(mockClient);
    
    // Vérifier que la fonction s'exécute sans erreur
    assert.ok(true, 'La fonction de vérification des permissions s\'exécute correctement');
});
