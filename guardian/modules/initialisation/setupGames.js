const { getDb } = require('../../database/db');

function sanitizeGameName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 64);
}

function generateDefaultGameName(guildId) {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) AS count FROM games WHERE guild_id = ?').get(guildId)?.count || 0;
  return `Jeu ${count + 1}`;
}

function listSetupGames(guildId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT game_id, name, steam_app_id, galerie_enabled, changelog_enabled, text_channel_enabled
       FROM games
       WHERE guild_id = ?
       ORDER BY game_id ASC`
    )
    .all(guildId);
}

function addSetupGame(guildId, partial = {}) {
  const db = getDb();
  const name = sanitizeGameName(partial.name || generateDefaultGameName(guildId));
  const steamAppId = partial.steam_app_id ? String(partial.steam_app_id).trim() : null;
  const galerieEnabled = partial.galerie_enabled ? 1 : 0;
  const changelogEnabled = partial.changelog_enabled === undefined ? 1 : partial.changelog_enabled ? 1 : 0;
  const textChannelEnabled = partial.text_channel_enabled === undefined ? 0 : partial.text_channel_enabled ? 1 : 0;

  db.prepare(
    `INSERT INTO games (guild_id, name, steam_app_id, galerie_enabled, changelog_enabled, text_channel_enabled)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(guildId, name, steamAppId, galerieEnabled, changelogEnabled, textChannelEnabled);

  return db
    .prepare(
      `SELECT game_id, name, steam_app_id, galerie_enabled, changelog_enabled, text_channel_enabled
       FROM games
       WHERE guild_id = ?
       ORDER BY game_id DESC
       LIMIT 1`
    )
    .get(guildId);
}

function removeLastSetupGame(guildId) {
  const db = getDb();
  const last = db
    .prepare('SELECT game_id FROM games WHERE guild_id = ? ORDER BY game_id DESC LIMIT 1')
    .get(guildId);

  if (!last) {
    return null;
  }

  db.prepare('DELETE FROM games WHERE guild_id = ? AND game_id = ?').run(guildId, last.game_id);
  return last.game_id;
}

function removeSetupGameById(guildId, gameId) {
  const db = getDb();
  const game = db.prepare('SELECT game_id, name FROM games WHERE guild_id = ? AND game_id = ?').get(guildId, gameId);
  if (!game) return null;
  db.prepare('DELETE FROM games WHERE guild_id = ? AND game_id = ?').run(guildId, gameId);
  return game;
}

function findSetupGameByName(guildId, name) {
  const db = getDb();
  const normalized = String(name || '').trim().toLowerCase();
  return db.prepare('SELECT * FROM games WHERE guild_id = ? AND lower(name) = ?').get(guildId, normalized) || null;
}

function updateSetupGame(guildId, gameId, patch = {}) {
  const db = getDb();
  const current = db
    .prepare(
      `SELECT game_id, name, steam_app_id, galerie_enabled, changelog_enabled, text_channel_enabled
       FROM games
       WHERE guild_id = ? AND game_id = ?`
    )
    .get(guildId, gameId);

  if (!current) {
    return null;
  }

  const next = {
    name: patch.name !== undefined ? sanitizeGameName(patch.name) : current.name,
    steam_app_id: patch.steam_app_id !== undefined ? String(patch.steam_app_id || '').trim() || null : current.steam_app_id,
    galerie_enabled: patch.galerie_enabled !== undefined ? (patch.galerie_enabled ? 1 : 0) : current.galerie_enabled,
    changelog_enabled: patch.changelog_enabled !== undefined ? (patch.changelog_enabled ? 1 : 0) : current.changelog_enabled,
    text_channel_enabled: patch.text_channel_enabled !== undefined ? (patch.text_channel_enabled ? 1 : 0) : current.text_channel_enabled
  };

  db.prepare(
    `UPDATE games
     SET name = ?, steam_app_id = ?, galerie_enabled = ?, changelog_enabled = ?, text_channel_enabled = ?
     WHERE guild_id = ? AND game_id = ?`
  ).run(next.name, next.steam_app_id, next.galerie_enabled, next.changelog_enabled, next.text_channel_enabled, guildId, gameId);

  return db
    .prepare(
      `SELECT game_id, name, steam_app_id, galerie_enabled, changelog_enabled, text_channel_enabled
       FROM games
       WHERE guild_id = ? AND game_id = ?`
    )
    .get(guildId, gameId);
}

module.exports = {
  listSetupGames,
  addSetupGame,
  removeLastSetupGame,
  removeSetupGameById,
  findSetupGameByName,
  updateSetupGame
};
