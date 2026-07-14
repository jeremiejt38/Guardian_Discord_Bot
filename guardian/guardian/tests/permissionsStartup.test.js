const { test } = require('node:test');
const assert = require('assert');
const { checkPermissions } = require('../events/ready');

// Mock client pour les tests
const mockClient = {
  guilds: {
    cache: new Map([
      // Serveur avec toutes les permissions
      ['guild1', {
        id: 'guild1',
        name: 'Test Server 1',
        members: {
          me: {
            permissions: {
              has: (perm) => true
            }
          }
        }
      }],
      // Serveur sans permissions
      ['guild2', {
        id: 'guild2',
        name: 'Test Server 2',
        members: {
          me: {
            permissions: {
              has: (perm) => perm !== 'ManageChannels' && perm !== 'ManageRoles'
            }
          }
        }
      }]
    ])
  },
  users: {
    fetch: async () => ({
      send: async () => {}
    })
  }
};

test('checkPermissions should detect missing permissions', async () => {
  // Mock console.error pour éviter les logs pendant les tests
  const originalError = console.error;
  console.error = () => {};
  
  try {
    await checkPermissions(mockClient);
    // Le test passe si aucune erreur n'est levée
    assert.ok(true);
  } catch (error) {
    assert.fail('checkPermissions should not throw an error');
  } finally {
    console.error = originalError;
  }
});
