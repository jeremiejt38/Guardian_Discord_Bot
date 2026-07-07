const { CHANNELS } = require('../../config');
const { findTextChannelByName } = require('../utils/channels');

const LEVELS = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
});

const levelName = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase();
const threshold = LEVELS[levelName] ?? LEVELS.info;

function toErrorContext(error) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack
  };
}

function write(level, message, context) {
  if ((LEVELS[level] ?? LEVELS.info) < threshold) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message
  };

  if (context !== undefined) {
    payload.context = toErrorContext(context);
  }

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

async function logToDiscord(guild, content) {
  if (!guild?.channels?.cache) {
    write('warn', 'Cannot log to Discord: invalid guild reference');
    return;
  }

  const channelName = CHANNELS.moderationLogs;
  const channel = findTextChannelByName(guild, channelName);

  if (!channel) {
    write('warn', 'Discord log channel not found', { guildId: guild.id, channelName });
  } else {
    try {
      await channel.send({ content });
    } catch (error) {
      write('error', 'Failed to send Discord log message', error);
    }
  }

  const configLogsChannel = findTextChannelByName(guild, CHANNELS.configLogs);
  if (configLogsChannel) {
    const ts = `<t:${Math.floor(Date.now() / 1000)}:T>`;
    await configLogsChannel.send(`👤 ${ts} ${content}`).catch(() => {});
  }
}

module.exports = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
  logToDiscord
};
