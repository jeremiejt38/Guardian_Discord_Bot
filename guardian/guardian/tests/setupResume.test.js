const { test } = require('node:test');
const assert = require('node:assert');
const { SlashCommandBuilder } = require('discord.js');
const { setupResume } = require('../commands/setupResume');

// Mock des dépendances
const mockInteraction = {
  member: {
    permissions: {
      has: () => true
    }
  },
  user: {
    id: '123456789'
  },
  reply: () => {},
  locale: 'en'
};

test('setupResume command structure', () => {
  assert.ok(setupResume.data);
  assert.ok(setupResume.data.name);
  assert.ok(setupResume.data.description);
});

test('setupResume command execution with proper permissions', async () => {
  // Mock setupFlow
  const originalSetupFlow = require('../modules/initialisation/setupFlow');
  let flowCalled = false;
  
  // Remplacer la fonction setupFlow par un mock
  const mockSetupFlow = async (interaction) => {
    flowCalled = true;
    return Promise.resolve();
  };
  
  // Temporairement remplacer la fonction
  require('../modules/initialisation/setupFlow').setupFlow = mockSetupFlow;
  
  try {
    await setupResume.execute(mockInteraction);
    assert.ok(flowCalled, 'setupFlow should be called');
  } finally {
    // Restaurer la fonction originale
    require('../modules/initialisation/setupFlow').setupFlow = originalSetupFlow;
  }
});

test('setupResume command execution without permissions', async () => {
  const mockInteractionNoPerm = {
    member: {
      permissions: {
        has: () => false
      }
    },
    user: {
      id: '123456789'
    },
    reply: (content) => {
      assert.ok(content.content.includes('permission'));
    },
    locale: 'en'
  };
  
  await setupResume.execute(mockInteractionNoPerm);
});

test('setupResume command execution by admin', async () => {
  const mockAdminInteraction = {
    member: {
      permissions: {
        has: () => true
      }
    },
    user: {
      id: process.env.BOT_ADMIN_ID || 'admin_id'
    },
    reply: (content) => {
      assert.ok(content.content.includes('administrator'));
    },
    locale: 'en'
  };
  
  await setupResume.execute(mockAdminInteraction);
});
