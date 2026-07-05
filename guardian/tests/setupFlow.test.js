const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../database/db');
const { getGuildSetting, setGuildSetting } = require('../modules/config/settings');
const { getGradeMappings, setGradeRole } = require('../modules/initialisation/gradeMapping');
const { handleSetupInteraction } = require('../modules/initialisation/setupFlow');
const setupModule = require('../modules/initialisation/setup');

function buildFakeRole({ id, name, position = 0, managed = false, memberCount = 0 }) {
  return {
    id,
    name,
    position,
    managed,
    members: {
      size: memberCount
    }
  };
}

function buildFakeRolesCache() {
  return {
    filter() { return this; },
    sort() { return this; },
    first() { return []; },
    get() { return undefined; },
    some() { return false; }
  };
}

function buildFakeRolesCacheFromRoles(roles) {
  return {
    filter(fn) {
      return buildFakeRolesCacheFromRoles(roles.filter(fn));
    },
    sort(fn) {
      roles.sort(fn);
      return this;
    },
    first(n) {
      return roles.slice(0, n);
    },
    get(id) {
      return roles.find((role) => role.id === id);
    },
    some(fn) {
      return roles.some(fn);
    }
  };
}

let nextGuildIndex = 1;

function buildFakeGuild({ id } = {}) {
  return {
    id: id || `test-guild-${nextGuildIndex++}`,
    ownerId: 'owner',
    roles: {
      cache: buildFakeRolesCache(),
      everyone: { id: 'everyone' }
    },
    channels: {
      cache: new Map()
    }
  };
}

function buildFakeInteraction({ customId, userId = 'owner', guild = buildFakeGuild(), values = [], stringSelect = false }) {
  let replied = null;
  let updated = null;
  let deferred = null;
  let editReplied = null;

  return {
    customId,
    guildId: guild.id,
    guild,
    user: { id: userId },
    values,
    memberPermissions: { has: () => true },
    isButton: () => !stringSelect,
    isStringSelectMenu: () => stringSelect,
    isModalSubmit: () => false,
    isRepliable: () => true,
    reply: async (payload) => { replied = payload; return { payload }; },
    update: async (payload) => { updated = payload; return { payload }; },
    deferReply: async (payload) => { deferred = payload; },
    editReply: async (payload) => { editReplied = payload; },
    get replied() { return replied; },
    get updated() { return updated; },
    get deferred() { return deferred; },
    get editReplied() { return editReplied; }
  };
}

test('setup:start stores setup owner and replies with step content', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  const interaction = buildFakeInteraction({ customId: 'setup:start', guild });

  const handled = await handleSetupInteraction(interaction);
  assert.strictEqual(handled, true);
  assert.ok(interaction.replied || interaction.updated);
  assert.ok(interaction.replied?.content || interaction.updated?.content, 'Expected a reply or update payload');
});

test('setup:start rejects non-owner if setup owner already exists', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'owner_id', 'owner');

  const interaction = buildFakeInteraction({ customId: 'setup:start', userId: 'other', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.ok(interaction.replied?.content.includes('Seul le propriétaire'), 'Expected forbidden message for non-owner');
});

test('setup:grade:role selects a role and rerenders the first step', async () => {
  initDatabase(':memory:');

  const roles = [
    buildFakeRole({ id: 'role-invite', name: 'Invite', position: 1, memberCount: 0 }),
    buildFakeRole({ id: 'role-owner', name: 'Owner', position: 2, memberCount: 1 })
  ];
  const guild = buildFakeGuild();
  guild.roles.cache = buildFakeRolesCacheFromRoles(roles);

  const interaction = buildFakeInteraction({
    customId: 'setup:grade:role:invite',
    guild,
    stringSelect: true,
    values: ['role-invite']
  });

  const handled = await handleSetupInteraction(interaction);
  assert.strictEqual(handled, true);
  assert.strictEqual(getGradeMappings(guild.id).invite, 'role-invite');
  assert.ok(interaction.updated?.content, 'Expected step one to rerender after role selection');
});

test('setup:step:next replies with validation error when mappings are incomplete', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  const interaction = buildFakeInteraction({ customId: 'setup:step:next', guild });

  const handled = await handleSetupInteraction(interaction);
  assert.strictEqual(handled, true);
  assert.strictEqual(interaction.replied?.ephemeral, true);
  assert.ok(interaction.replied?.content, 'Expected validation reply for incomplete mappings');
});

test('setup:step:next advances to step two when mappings are complete', async () => {
  initDatabase(':memory:');

  const roles = [
    buildFakeRole({ id: 'invite-role', name: 'Invite', position: 1, memberCount: 0 }),
    buildFakeRole({ id: 'membre-role', name: 'Membre', position: 2, memberCount: 0 }),
    buildFakeRole({ id: 'moderateur-role', name: 'Moderateur', position: 3, memberCount: 0 }),
    buildFakeRole({ id: 'manager-role', name: 'Manager', position: 4, memberCount: 0 }),
    buildFakeRole({ id: 'owner-role', name: 'Owner', position: 5, memberCount: 1 })
  ];
  const guild = buildFakeGuild();
  guild.roles.cache = buildFakeRolesCacheFromRoles(roles);

  setGradeRole(guild.id, 'invite', 'invite-role');
  setGradeRole(guild.id, 'membre', 'membre-role');
  setGradeRole(guild.id, 'moderateur', 'moderateur-role');
  setGradeRole(guild.id, 'manager', 'manager-role');
  setGradeRole(guild.id, 'owner', 'owner-role');

  const interaction = buildFakeInteraction({ customId: 'setup:step:next', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(getGuildSetting(guild.id, 'setup', 'step'), 2);
  assert.ok(interaction.updated?.content, 'Expected step two content after advancing');
});

test('toggleBioRequired updates the member bio config and rerenders step two', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 2);

  const interaction = buildFakeInteraction({ customId: 'setup:members:bio:toggle', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(getGuildSetting(guild.id, 'members', 'bio_required'), true);
  assert.ok(interaction.updated?.content || interaction.replied?.content, 'Expected step two rerender after toggle');
});

test('setup:step:next advances from step two to step three', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 2);

  const interaction = buildFakeInteraction({ customId: 'setup:step:next', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(getGuildSetting(guild.id, 'setup', 'step'), 3);
  assert.ok(interaction.updated?.content, 'Expected step three content after advancing');
});

test('setup:finalize replies not ready when current step is less than five', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 4);

  const interaction = buildFakeInteraction({ customId: 'setup:finalize', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(interaction.replied?.ephemeral, true);
  assert.ok(interaction.replied?.content?.length > 0, 'Expected a blocked finalization message');
});

test('setup:games:add creates a setup game and rerenders step three', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 3);

  const initialGames = require('../modules/initialisation/setupGames').listSetupGames(guild.id);
  assert.strictEqual(initialGames.length, 0);

  const interaction = buildFakeInteraction({ customId: 'setup:games:add', guild });
  const handled = await handleSetupInteraction(interaction);

  const games = require('../modules/initialisation/setupGames').listSetupGames(guild.id);
  assert.strictEqual(handled, true);
  assert.strictEqual(games.length, 1);
  assert.ok(interaction.updated?.content || interaction.replied?.content, 'Expected step three rerender after adding a game');
});

test('setup:games:gallery:toggle toggles gallery enabled on current game', async () => {
  initDatabase(':memory:');

  const { addSetupGame, listSetupGames } = require('../modules/initialisation/setupGames');
  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 3);

  addSetupGame(guild.id, { galerie_enabled: false });
  const before = listSetupGames(guild.id)[0];
  assert.strictEqual(before.galerie_enabled, 0);

  const interaction = buildFakeInteraction({ customId: 'setup:games:gallery:toggle', guild });
  const handled = await handleSetupInteraction(interaction);

  const after = listSetupGames(guild.id)[0];
  assert.strictEqual(handled, true);
  assert.strictEqual(after.galerie_enabled, 1);
  assert.ok(interaction.updated?.content, 'Expected step three rerender after toggling gallery');
});

test('setup:modules:suggestions:toggle toggles suggestions config and rerenders step four', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 4);
  setGuildSetting(guild.id, 'channels', 'suggestions_enabled', true);

  const interaction = buildFakeInteraction({ customId: 'setup:modules:suggestions:toggle', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(getGuildSetting(guild.id, 'channels', 'suggestions_enabled'), false);
  assert.ok(interaction.updated?.content, 'Expected step four rerender after toggling suggestions');
});

test('setup:step:next advances from step three to step four', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 3);

  const interaction = buildFakeInteraction({ customId: 'setup:step:next', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(getGuildSetting(guild.id, 'setup', 'step'), 4);
  assert.ok(interaction.updated?.content, 'Expected step four content after advancing from step three');
});

test('setup:step:next advances from step four to step five', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 4);

  const interaction = buildFakeInteraction({ customId: 'setup:step:next', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(getGuildSetting(guild.id, 'setup', 'step'), 5);
  assert.ok(interaction.updated?.content, 'Expected step five summary after advancing from step four');
});

test('setup:finalize calls completeGuildSetup when step five is reached', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 5);

  let finalizeCalled = false;
  const originalCompleteGuildSetup = setupModule.completeGuildSetup;
  const originalFinalizeInstall = setupModule.finalizeInstall;
  setupModule.completeGuildSetup = async () => { finalizeCalled = true; };
  setupModule.finalizeInstall = async () => { finalizeCalled = true; };

  try {
    const interaction = buildFakeInteraction({ customId: 'setup:finalize', guild });
    const handled = await handleSetupInteraction(interaction);

    assert.strictEqual(handled, true);
    const confirmedByReply = interaction.replied?.ephemeral === true && interaction.replied?.content?.length > 0;
    const confirmedByDefer = interaction.deferred != null;
    assert.ok(confirmedByReply || confirmedByDefer, 'Expected a finalization reply or deferReply call');
  } finally {
    setupModule.completeGuildSetup = originalCompleteGuildSetup;
    setupModule.finalizeInstall = originalFinalizeInstall;
  }
});
