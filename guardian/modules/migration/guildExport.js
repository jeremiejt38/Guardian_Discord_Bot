const { getDb } = require('../../database/db');

const MIGRATION_VERSION = 1;
const PLACEHOLDER_GUILD_ID = '__MIGRATION_GUILD_ID__';

const MIGRATION_TABLES = [
  { name: 'guilds', idColumn: 'guild_id' },
  { name: 'guild_config', idColumn: 'guild_id' },
  { name: 'grades', idColumn: 'guild_id' },
  { name: 'games', idColumn: 'guild_id' },
  { name: 'member_games', idColumn: 'guild_id' },
  { name: 'members', idColumn: 'guild_id' },
  { name: 'sanctions', idColumn: 'guild_id' },
  { name: 'servers_jeu', idColumn: 'guild_id' },
  { name: 'parrainage', idColumn: 'guild_id' },
  { name: 'vocal_temp', idColumn: 'guild_id' },
  { name: 'promotion_requests', idColumn: 'guild_id' },
  { name: 'reports', idColumn: 'guild_id' },
  { name: 'game_requests', idColumn: 'guild_id' },
  { name: 'guild_tier', idColumn: 'guild_id' },
  { name: 'guild_licenses', idColumn: 'guild_id' }
];

function listTables(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
}

function exportGuildData(guildId) {
  const db = getDb();
  const existingTables = new Set(listTables(db));
  const snapshot = {
    version: MIGRATION_VERSION,
    exportedAt: new Date().toISOString(),
    originalGuildId: guildId,
    guildId,
    tables: {}
  };

  for (const { name, idColumn } of MIGRATION_TABLES) {
    if (!existingTables.has(name)) continue;
    const rows = db.prepare(`SELECT * FROM ${name} WHERE ${idColumn} = ?`).all(guildId);
    if (rows.length === 0) continue;
    snapshot.tables[name] = rows;
  }

  return snapshot;
}

function encodeSnapshot(snapshot) {
  return Buffer.from(JSON.stringify(snapshot)).toString('base64');
}

function decodeSnapshot(encoded) {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  MIGRATION_VERSION,
  PLACEHOLDER_GUILD_ID,
  MIGRATION_TABLES,
  exportGuildData,
  encodeSnapshot,
  decodeSnapshot
};
