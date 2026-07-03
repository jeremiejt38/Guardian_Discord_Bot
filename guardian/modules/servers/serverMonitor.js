const net = require('net');
const { EmbedBuilder } = require('discord.js');
const { getDb } = require('../../database/db');
const { CHANNEL_NAMES } = require('../../config');
const { getGuildSetting } = require('../config/settings');
const logger = require('../logs/logger');

const lastRunByGuild = new Map();

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

function renderStatus(status) {
  if (status === 'online') {
    return '✅ En ligne';
  }
  if (status === 'unstable') {
    return '⚠️ Instable';
  }
  return '❌ Hors ligne';
}

async function resolveServerListChannel(guild) {
  const configuredId = getGuildSetting(guild.id, 'channels', 'server_list_channel_id', null);
  if (configuredId) {
    const byId = await guild.channels.fetch(configuredId).catch(() => null);
    if (byId?.isTextBased()) {
      return byId;
    }

    logger.warn(`Configured server list channel not found for guild ${guild.id}, fallback by name`);
  }

  return guild.channels.cache.find((channel) => channel.name === CHANNEL_NAMES.serverList && channel.isTextBased()) || null;
}

function buildServerEmbed(server, status, checkedAtIso) {
  return new EmbedBuilder()
    .setTitle(`${server.name} (${server.game})`)
    .setDescription([
      `IP: ${server.ip}:${server.port}`,
      `Statut: ${renderStatus(status)}`,
      `Dernière vérification: ${new Date(checkedAtIso).toLocaleString('fr-FR')}`
    ].join('\n'));
}

async function upsertStatusMessage(channel, server, status, checkedAtIso) {
  const db = getDb();
  const embed = buildServerEmbed(server, status, checkedAtIso);

  if (server.status_message_id) {
    const existing = await channel.messages.fetch(server.status_message_id).catch(() => null);
    if (existing) {
      await existing.edit({ embeds: [embed] });
      return;
    }

    logger.warn(`Status message not found for server_id=${server.server_id}, creating a new one`);
  }

  const created = await channel.send({ embeds: [embed] });
  db.prepare('UPDATE servers_jeu SET status_message_id = ? WHERE server_id = ?').run(created.id, server.server_id);
}

function shouldRunGuild(guildId, nowMs, intervalMinutes) {
  const last = lastRunByGuild.get(guildId) || 0;
  return nowMs - last >= intervalMinutes * 60 * 1000;
}

async function monitorServers(client) {
  const db = getDb();
  const servers = db
    .prepare('SELECT server_id, guild_id, name, game, ip, port, status_message_id FROM servers_jeu')
    .all();
  const now = new Date().toISOString();

  const serversByGuild = new Map();
  for (const server of servers) {
    const list = serversByGuild.get(server.guild_id) || [];
    list.push(server);
    serversByGuild.set(server.guild_id, list);
  }

  const nowMs = Date.now();

  for (const [guildId, guildServers] of serversByGuild) {
    const intervalMinutes = Math.max(1, Number(getGuildSetting(guildId, 'servers', 'monitor_interval_minutes', 5)));
    if (!shouldRunGuild(guildId, nowMs, intervalMinutes)) {
      continue;
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      continue;
    }

    const statusChannel = await resolveServerListChannel(guild);

    for (const server of guildServers) {
      const status = await checkTcpServer(server.ip, Number(server.port));
      db.prepare('UPDATE servers_jeu SET last_status = ?, last_check = ? WHERE server_id = ?').run(status, now, server.server_id);

      if (!statusChannel) {
        continue;
      }

      await upsertStatusMessage(statusChannel, server, status, now).catch((error) => {
        logger.error(`Failed status message update for server_id=${server.server_id}`, error);
      });
    }

    lastRunByGuild.set(guildId, nowMs);
  }
}

function startServerMonitor(client, intervalMs = 60 * 1000) {
  return setInterval(() => {
    monitorServers(client).catch((error) => logger.error('Server monitor cycle failure', error));
  }, intervalMs);
}

module.exports = {
  checkTcpServer,
  monitorServers,
  startServerMonitor
};
