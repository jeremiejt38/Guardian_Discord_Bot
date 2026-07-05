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

function buildFakeInteraction({ customId, userId = 'owner', guild = buildFakeGuild(), values = [], stringSelect = false, isModalSubmit: modalSubmit = false, fields = {} }) {
  let replied = null;
  let updated = null;
  let deferred = null;
  let editReplied = null;
  let messageEdited = null;
  let modalShown = null;

  const obj = {
    customId,
    guildId: guild.id,
    guild,
    user: { id: userId },
    values,
    memberPermissions: { has: () => true },
    isButton: () => !stringSelect && !modalSubmit,
    isStringSelectMenu: () => stringSelect,
    isModalSubmit: () => modalSubmit,
    isRepliable: () => true,
    fields: {
      getTextInputValue: (key) => fields[key] ?? ''
    },
    channel: {
      send: async () => {}
    },
    message: { edit: async (payload) => { messageEdited = payload; return payload; } },
    reply: async (payload) => { replied = payload; return { payload }; },
    update: async (payload) => { updated = payload; return { payload }; },
    deferReply: async (payload) => { deferred = payload; },
    deferUpdate: async () => {},
    editReply: async (payload) => { editReplied = payload; },
    showModal: async (modal) => { modalShown = modal; },
    get replied() { return replied; },
    get updated() { return updated; },
    get deferred() { return deferred; },
    get editReplied() { return editReplied; },
    get messageEdited() { return messageEdited; },
    get modalShown() { return modalShown; }
  };
  return obj;
}

test('startWizardInChannel edits the message with step 1 content', async () => {
  initDatabase(':memory:');
  const { startWizardInChannel } = require('../modules/initialisation/setupFlow');

  const guild = buildFakeGuild();
  const interaction = buildFakeInteraction({ customId: 'setup:start', guild });

  await startWizardInChannel(interaction);
  assert.ok(interaction.messageEdited?.content, 'Expected message.edit to be called with step 1 content');
});

test('setup:start rejects non-owner if setup owner already exists', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'owner_id', 'owner');

  const interaction = buildFakeInteraction({ customId: 'setup:start', userId: 'other', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.ok(interaction.replied?.content.includes('proprietaire'), 'Expected forbidden message for non-owner');
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
  assert.ok(interaction.messageEdited?.content, 'Expected step one to rerender after role selection');
});

test('setup:step:next replies with validation error when mappings are incomplete', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  const interaction = buildFakeInteraction({ customId: 'setup:step:next', guild });

  const handled = await handleSetupInteraction(interaction);
  assert.strictEqual(handled, true);
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
  assert.ok(interaction.messageEdited?.content, 'Expected step two content after advancing');
});

test('toggleBioRequired updates the member bio config and rerenders step two', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 2);

  const interaction = buildFakeInteraction({ customId: 'setup:members:bio:toggle', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(getGuildSetting(guild.id, 'members', 'bio_required'), true);
  assert.ok(interaction.messageEdited?.content, 'Expected step two rerender after toggle');
});

test('setup:step:next advances from step two to step three', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 2);

  const interaction = buildFakeInteraction({ customId: 'setup:step:next', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(getGuildSetting(guild.id, 'setup', 'step'), 3);
  assert.ok(interaction.messageEdited?.content, 'Expected step three content after advancing');
});

test('setup:finalize replies not ready when current step is less than five', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 4);

  const interaction = buildFakeInteraction({ customId: 'setup:finalize', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
});

test('setup:games:add opens a modal to enter game name', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 3);

  const interaction = buildFakeInteraction({ customId: 'setup:games:add', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.ok(interaction.modalShown, 'Expected a modal to be shown for adding a game');
});

test('setup:games:add:modal adds a game and rerenders step 6', async () => {
  initDatabase(':memory:');

  const { listSetupGames } = require('../modules/initialisation/setupGames');
  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 3);

  const interaction = buildFakeInteraction({
    customId: 'setup:games:add:modal',
    guild,
    isModalSubmit: true,
    fields: { name: 'Counter-Strike 2', steam_id: '730' }
  });
  const handled = await handleSetupInteraction(interaction);

  const games = listSetupGames(guild.id);
  assert.strictEqual(handled, true);
  assert.strictEqual(games.length, 1);
  assert.strictEqual(games[0].name, 'Counter-Strike 2');
  assert.strictEqual(games[0].steam_app_id, '730');
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
  assert.ok(interaction.messageEdited?.content, 'Expected step four rerender after toggling suggestions');
});

test('setup:step:next advances from step three to step four', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 3);

  const interaction = buildFakeInteraction({ customId: 'setup:step:next', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(getGuildSetting(guild.id, 'setup', 'step'), 4);
  assert.ok(interaction.messageEdited?.content, 'Expected step four content after advancing from step three');
});

test('setup:step:next advances from step four to step five', async () => {
  initDatabase(':memory:');

  const guild = buildFakeGuild();
  setGuildSetting(guild.id, 'setup', 'step', 4);

  const interaction = buildFakeInteraction({ customId: 'setup:step:next', guild });
  const handled = await handleSetupInteraction(interaction);

  assert.strictEqual(handled, true);
  assert.strictEqual(getGuildSetting(guild.id, 'setup', 'step'), 5);
  assert.ok(interaction.messageEdited?.content, 'Expected step five summary after advancing from step four');
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
  } finally {
    setupModule.completeGuildSetup = originalCompleteGuildSetup;
    setupModule.finalizeInstall = originalFinalizeInstall;
  }
});
