const { CHANNEL_NAMES } = require('../../config');

function formatError(error) {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return error;
}

function log(level, message, meta = undefined) {
  const payload = {
    level,
    message,
    ...(meta ? { meta } : {})
  };

  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === 'warn') {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

function info(message, meta) {
  log('info', message, meta);
}

function warn(message, meta) {
  log('warn', message, meta);
}

function error(message, err) {
  log('error', message, formatError(err));
}

async function logToDiscord(guild, content) {
  if (!guild) {
    return;
  }

  try {
    const channel = guild.channels.cache.find((item) => item.name === CHANNEL_NAMES.moderationLogs && item.isTextBased());
    if (channel) {
      await channel.send(content);
    }
  } catch (err) {
    error('Failed to send log to Discord', err);
  }
}

module.exports = {
  info,
  warn,
  error,
  logToDiscord
};
