const { getDb } = require('../../database/db');

function validateSnapshot(snapshot) {
  return (
    snapshot &&
    typeof snapshot === 'object' &&
    typeof snapshot.version === 'number' &&
    typeof snapshot.tables === 'object' &&
    snapshot.tables !== null
  );
}

function listTables(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
}

function importGuildData(snapshot, targetGuildId, options = {}) {
  if (!validateSnapshot(snapshot)) {
    throw new Error('Snapshot invalide');
  }
  const db = getDb();
  const existingTables = new Set(listTables(db));
  const sourceGuildId = snapshot.guildId || snapshot.originalGuildId;
  const { deleteExisting = true } = options;
  const result = { importedTables: {}, totalRows: 0 };

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const [tableName, rows] of Object.entries(snapshot.tables)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      if (!existingTables.has(tableName)) continue;
      const columns = Object.keys(rows[0]).filter((col) => rows[0][col] !== undefined);
      if (columns.length === 0) continue;
      const idColumn = columns.includes('guild_id') ? 'guild_id' : null;
      if (deleteExisting && idColumn === 'guild_id') {
        db.prepare(`DELETE FROM ${tableName} WHERE guild_id = ?`).run(targetGuildId);
      }
      const placeholders = columns.map(() => '?').join(',');
      const insert = db.prepare(`INSERT OR REPLACE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`);
      let count = 0;
      for (const row of rows) {
        const values = columns.map((col) => {
          let value = row[col];
          if (idColumn && col === idColumn && value === sourceGuildId && sourceGuildId !== targetGuildId) {
            value = targetGuildId;
          }
          return value;
        });
        insert.run(...values);
        count += 1;
      }
      result.importedTables[tableName] = count;
      result.totalRows += count;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return result;
}

module.exports = { validateSnapshot, importGuildData };
