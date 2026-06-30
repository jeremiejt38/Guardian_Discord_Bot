const net = require('net');
const { getDb } = require('../../database/db');

function checkTcpServer(ip, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const settle = (status) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(status);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => settle('online'));
    socket.once('timeout', () => settle('unstable'));
    socket.once('error', () => settle('offline'));
    socket.connect(port, ip);
  });
}

async function monitorServers() {
  const db = getDb();
  const servers = db.prepare('SELECT server_id, ip, port FROM servers_jeu').all();
  const now = new Date().toISOString();

  for (const server of servers) {
    const status = await checkTcpServer(server.ip, Number(server.port));
    db.prepare('UPDATE servers_jeu SET last_status = ?, last_check = ? WHERE server_id = ?').run(status, now, server.server_id);
  }
}

function startServerMonitor(intervalMs = 5 * 60 * 1000) {
  return setInterval(() => {
    monitorServers().catch(() => undefined);
  }, intervalMs);
}

module.exports = {
  checkTcpServer,
  monitorServers,
  startServerMonitor
};
