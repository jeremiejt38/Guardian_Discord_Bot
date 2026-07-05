const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { DATABASE_PATH, GRADE_NAMES } = require('../config');

let db;

class StatementCompat {
  constructor(statement) {
    this.statement = statement;
  }

  run(...params) {
    return this.statement.run(...params);
  }

  get(...params) {
    return this.statement.get(...params);
  }

  all(...params) {
    return this.statement.all(...params);
  }
}

class DatabaseCompat {
  constructor(filePath) {
    this.db = new DatabaseSync(filePath);
  }

  pragma(query) {
    this.db.exec(`PRAGMA ${query}`);
  }

  exec(sql) {
    this.db.exec(sql);
  }

  prepare(sql) {
    return new StatementCompat(this.db.prepare(sql));
  }

  transaction(fn) {
    return (...args) => {
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const result = fn(...args);
        this.db.exec('COMMIT');
        return result;
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    };
  }

  close() {
    this.db.close();
  }
}

function initDatabase(customPath = DATABASE_PATH) {
  if (db) {
    return db;
  }

  const dir = path.dirname(customPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new DatabaseCompat(customPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

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
      password TEXT,
      approved INTEGER NOT NULL DEFAULT 1,
      last_status TEXT CHECK (last_status IN ('online', 'offline', 'unstable')),
      last_check TEXT,
      status_message_id TEXT
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

    CREATE TABLE IF NOT EXISTS promotion_requests (
      request_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
      bio TEXT,
      sponsorship_id TEXT,
      message_id TEXT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by TEXT,
      reason TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      report_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      target_text TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence TEXT,
      status TEXT NOT NULL CHECK (status IN ('open', 'handled')) DEFAULT 'open',
      message_id TEXT,
      created_at TEXT NOT NULL,
      handled_at TEXT,
      handled_by TEXT
    );
  `);
  try {
    db.exec('ALTER TABLE servers_jeu ADD COLUMN status_message_id TEXT');
  } catch {
    // Column already exists on upgraded databases.
  }
  db.prepare('INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (1, ?)').run(new Date().toISOString());

  return db;
}

// run migrations for existing DB
function migrateDatabase() {
  const conn = getDb();
  const cols = conn.prepare(`PRAGMA table_info(servers_jeu)`).all();
  const names = cols.map((c) => c.name);
  if (!names.includes('approved')) {
    try {
      conn.exec('ALTER TABLE servers_jeu ADD COLUMN approved INTEGER NOT NULL DEFAULT 1');
    } catch (e) {
      // ignore migration errors
    }
  }
}


function getDb() {
  if (!db) {
    throw new Error('Database is not initialized. Call initDatabase() first.');
  }

  return db;
}

function setConfig(guildId, moduleName, key, value) {
  const conn = getDb();
  conn.prepare(
    `INSERT INTO guild_config (guild_id, module, key, value)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(guild_id, module, key)
     DO UPDATE SET value = excluded.value`
  ).run(guildId, moduleName, key, JSON.stringify(value));
}

function getConfig(guildId, moduleName, key, fallback = null) {
  const conn = getDb();
  const row = conn
    .prepare('SELECT value FROM guild_config WHERE guild_id = ? AND module = ? AND key = ?')
    .get(guildId, moduleName, key);

  if (!row) {
    return fallback;
  }

  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

function setGrade(guildId, gradeName, roleId) {
  const conn = getDb();
  conn.prepare(
    `INSERT INTO grades (guild_id, grade_name, role_id)
     VALUES (?, ?, ?)
     ON CONFLICT(guild_id, grade_name)
     DO UPDATE SET role_id = excluded.role_id`
  ).run(guildId, gradeName, roleId);
}

function getGrade(guildId, gradeName) {
  const conn = getDb();
  const row = conn
    .prepare('SELECT role_id FROM grades WHERE guild_id = ? AND grade_name = ?')
    .get(guildId, gradeName);

  return row?.role_id || null;
}

function getModerationRoleIds(guildId) {
  const conn = getDb();
  const rows = conn
    .prepare('SELECT role_id FROM grades WHERE guild_id = ? AND grade_name IN (?, ?, ?)')
    .all(guildId, GRADE_NAMES.moderateur, GRADE_NAMES.manager, GRADE_NAMES.owner);

  return rows.map((row) => row.role_id).filter(Boolean);
}

module.exports = {
  initDatabase,
  getDb,
  setConfig,
  getConfig,
  setGrade,
  getGrade,
  getModerationRoleIds
};
