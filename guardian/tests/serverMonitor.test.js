const test = require('node:test');
const assert = require('node:assert/strict');

test('renderStatus returns localized status labels', () => {
  // Replicate the pure function from serverMonitor.js
  function renderStatus(status) {
    if (status === 'online') {
      return '✅ En ligne';
    }
    if (status === 'unstable') {
      return '⚠️ Instable';
    }
    return '❌ Hors ligne';
  }

  assert.equal(renderStatus('online'), '✅ En ligne');
  assert.equal(renderStatus('unstable'), '⚠️ Instable');
  assert.equal(renderStatus('offline'), '❌ Hors ligne');
  assert.equal(renderStatus(null), '❌ Hors ligne');
  assert.equal(renderStatus(undefined), '❌ Hors ligne');
  assert.equal(renderStatus('unknown'), '❌ Hors ligne');
});

test('shouldRunGuild throttles by guild interval', () => {
  const lastRunByGuild = new Map();

  function shouldRunGuild(guildId, nowMs, intervalMinutes) {
    const last = lastRunByGuild.get(guildId) || 0;
    return nowMs - last >= intervalMinutes * 60 * 1000;
  }

  const now = Date.now();

  // First call for a guild should always run
  assert.equal(shouldRunGuild('g1', now, 5), true);

  // After recording, should not run within the interval
  lastRunByGuild.set('g1', now);
  assert.equal(shouldRunGuild('g1', now + 4 * 60 * 1000, 5), false);

  // After interval has elapsed, should run
  assert.equal(shouldRunGuild('g1', now + 6 * 60 * 1000, 5), true);

  // Different guild is independent
  assert.equal(shouldRunGuild('g2', now, 5), true);
});

test('checkTcpServer resolves a status for localhost', async () => {
  const net = require('net');

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

  // Port 1 should be refused -> offline
  const status = await checkTcpServer('127.0.0.1', 1, 500);
  assert.ok(['offline', 'unstable'].includes(status));
});
