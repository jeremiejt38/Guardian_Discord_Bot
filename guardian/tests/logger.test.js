const test = require('node:test');
const assert = require('node:assert/strict');

test('logger module exports expected logging functions', () => {
  process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token';

  const modulePath = require.resolve('../modules/logs/logger');
  delete require.cache[modulePath];
  const logger = require('../modules/logs/logger');

  assert.equal(typeof logger.debug, 'function');
  assert.equal(typeof logger.info, 'function');
  assert.equal(typeof logger.warn, 'function');
  assert.equal(typeof logger.error, 'function');
  assert.equal(typeof logger.logToDiscord, 'function');

  // Calling log functions should not throw
  logger.debug('test debug');
  logger.info('test info');
  logger.warn('test warn');
  logger.error('test error');
  logger.error('test error with context', new Error('test'));
});

test('logToDiscord handles invalid guild gracefully', async () => {
  const modulePath = require.resolve('../modules/logs/logger');
  delete require.cache[modulePath];
  const logger = require('../modules/logs/logger');

  // Should not throw with null/undefined guild
  await logger.logToDiscord(null, 'test message');
  await logger.logToDiscord(undefined, 'test message');
  await logger.logToDiscord({}, 'test message');

  // With guild that has channels.cache but no matching channel
  const fakeGuild = {
    id: 'g1',
    channels: {
      cache: {
        find: () => null
      }
    }
  };
  await logger.logToDiscord(fakeGuild, 'test message');
});
