const { getDb } = require('../../database/db');
const { encrypt, decrypt } = require('../crypto/secrets');
const logger = require('../logs/logger');

function addServer(guildId, name, game, ip, port, passwordPlain, addedBy = null, approved = 1) {
  const db = getDb();
  let encrypted = null;
  try {
    if (passwordPlain) encrypted = encrypt(passwordPlain);
  } catch (err) {
    logger.warn('Encryption key missing or invalid — saving password as plain text');
    encrypted = passwordPlain;
  }
  db.prepare(
    `INSERT INTO servers_jeu (guild_id, name, game, ip, port, password, approved, last_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(guildId, name, game, ip, port, encrypted, approved, null);
  const res = db.prepare('SELECT last_insert_rowid() as id').get();
  return res.id;
}

function listServersForGuild(guildId, onlyApproved = true) {
  const db = getDb();
  const rows = onlyApproved
    ? db.prepare('SELECT server_id, name, game, ip, port, password, last_status, last_check FROM servers_jeu WHERE guild_id = ? AND approved = 1').all(guildId)
    : db.prepare('SELECT server_id, name, game, ip, port, password, approved, last_status, last_check FROM servers_jeu WHERE guild_id = ?').all(guildId);

  return rows.map((r) => ({
    server_id: r.server_id,
    name: r.name,
    game: r.game,
    ip: r.ip,
    port: r.port,
    password: (() => {
      try {
        return r.password ? decrypt(r.password) : null;
      } catch (e) {
        return r.password;
      }
    })(),
    approved: typeof r.approved !== 'undefined' ? r.approved : 1,
    last_status: r.last_status,
    last_check: r.last_check
  }));
}

function setApproved(serverId, approved) {
  const db = getDb();
  db.prepare('UPDATE servers_jeu SET approved = ? WHERE server_id = ?').run(approved ? 1 : 0, serverId);
}

module.exports = { addServer, listServersForGuild, setApproved };
