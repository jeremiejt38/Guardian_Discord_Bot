const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { DATABASE_PATH } = require('../config');

let db;

function initDatabase(customPath = DATABASE_PATH) {
  if (db) {
    return db;
  }

  const dir = path.dirname(customPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(customPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      guild_id TEXT PRIMARY KEY,
      setup_done INTEGER NOT NULL DEFAULT 0,
      setup_hash TEXT,
      owner_id TEXT,
      language TEXT NOT NULL DEFAULT 'fr'
    );

    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT NOT NULL,
      module TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY (guild_id, module, key)
    );

    CREATE TABLE IF NOT EXISTS grades (
      guild_id TEXT NOT NULL,
      grade_name TEXT NOT NULL CHECK (grade_name IN ('invite', 'membre', 'moderateur', 'manager', 'owner')),
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, grade_name)
    );

    CREATE TABLE IF NOT EXISTS games (
      game_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      steam_app_id TEXT,
      role_id TEXT,
      channel_text_id TEXT,
      channel_galerie_id TEXT,
      channel_changelog_id TEXT,
      category_id TEXT,
      galerie_enabled INTEGER NOT NULL DEFAULT 0,
      changelog_enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS member_games (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      game_id INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id, game_id)
    );

    CREATE TABLE IF NOT EXISTS members (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      grade TEXT NOT NULL,
      join_date TEXT NOT NULL,
      bio TEXT,
      parrain_id TEXT,
      score_comportement INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS sanctions (
      sanction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('warn', 'mute', 'kick', 'ban')),
      reason TEXT NOT NULL,
      applied_by TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      duration TEXT,
      auto INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS changelogs_seen (
      game_id INTEGER PRIMARY KEY,
      last_changelog_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS servers_jeu (
      server_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      game TEXT NOT NULL,
      ip TEXT NOT NULL,
      port INTEGER NOT NULL,
      last_status TEXT CHECK (last_status IN ('online', 'offline', 'unstable')),
      last_check TEXT
    );

    CREATE TABLE IF NOT EXISTS parrainage (
      guild_id TEXT NOT NULL,
      parrain_id TEXT NOT NULL,
      invite_id TEXT NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (guild_id, invite_id)
    );

    CREATE TABLE IF NOT EXISTS vocal_temp (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      game_id INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database is not initialized. Call initDatabase() first.');
  }

  return db;
}

module.exports = {
  initDatabase,
  getDb
};
