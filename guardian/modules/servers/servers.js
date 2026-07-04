const { getDb } = require('../../database/db');
const { encrypt, decrypt } = require('../crypto/secrets');
const logger = require('../logs/logger');

function addServer(guildId, name, game, ip, port, passwordPlain) {
  const db = getDb();
  let encrypted = null;
  try {
    if (passwordPlain) encrypted = encrypt(passwordPlain);
  } catch (err) {
    logger.warn('Encryption key missing or invalid — saving password as plain text');
    encrypted = passwordPlain;
  }

  db.prepare(
    `INSERT INTO servers_jeu (guild_id, name, game, ip, port, password, last_status) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(guildId, name, game, ip, port, encrypted, 'unknown');
}

function listServersForGuild(guildId) {
  const db = getDb();
  const rows = db.prepare('SELECT server_id, name, game, ip, port, password, last_status FROM servers_jeu WHERE guild_id = ?').all(guildId);
  return rows.map((r) => ({
    server_id: r.server_id,
    name: r.name,
    game: r.game,
    ip: r.ip,
    port: r.port,
    password: (() => {
      try {
        return decrypt(r.password);
      } catch (e) {
        return r.password;
      }
    })(),
    last_status: r.last_status
  }));
}

module.exports = { addServer, listServersForGuild };
