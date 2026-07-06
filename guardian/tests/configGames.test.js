const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../database/db');
const {
  listSetupGames,
  addSetupGame,
  removeSetupGameById,
  findSetupGameByName,
  updateSetupGame
} = require('../modules/initialisation/setupGames');

let guildIndex = 1;
function gid() { return `cg-guild-${guildIndex++}`; }

test('addSetupGame crée un jeu et findSetupGameByName le retrouve', () => {
  initDatabase(':memory:');
  const guildId = gid();
  addSetupGame(guildId, { name: 'Minecraft', steam_app_id: null });
  const found = findSetupGameByName(guildId, 'minecraft');
  assert.ok(found, 'Doit trouver le jeu en recherche insensible à la casse');
  assert.strictEqual(found.name, 'Minecraft');
});

test('removeSetupGameById supprime le jeu', () => {
  initDatabase(':memory:');
  const guildId = gid();
  const game = addSetupGame(guildId, { name: 'CS2', steam_app_id: '730' });
  const removed = removeSetupGameById(guildId, game.game_id);
  assert.ok(removed, 'Doit retourner le jeu supprimé');
  assert.strictEqual(listSetupGames(guildId).length, 0);
});

test('removeSetupGameById retourne null si jeu inexistant', () => {
  initDatabase(':memory:');
  const guildId = gid();
  const result = removeSetupGameById(guildId, 9999);
  assert.strictEqual(result, null);
});

test('updateSetupGame met à jour text_channel_enabled', () => {
  initDatabase(':memory:');
  const guildId = gid();
  const game = addSetupGame(guildId, { name: 'Rust', text_channel_enabled: 1 });
  const updated = updateSetupGame(guildId, game.game_id, { text_channel_enabled: false });
  assert.strictEqual(updated.text_channel_enabled, 0);
});

test('findSetupGameByName retourne null si jeu absent', () => {
  initDatabase(':memory:');
  const guildId = gid();
  const result = findSetupGameByName(guildId, 'JeuInexistant');
  assert.strictEqual(result, null);
});

test('listSetupGames retourne tous les jeux du guild', () => {
  initDatabase(':memory:');
  const guildId = gid();
  addSetupGame(guildId, { name: 'Jeu A' });
  addSetupGame(guildId, { name: 'Jeu B' });
  const games = listSetupGames(guildId);
  assert.strictEqual(games.length, 2);
});
