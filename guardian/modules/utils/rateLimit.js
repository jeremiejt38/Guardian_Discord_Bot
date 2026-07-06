/**
 * rateLimit.js
 *
 * Debounce in-memory pour les interactions Discord.
 * Evite les double-clics et le spam de boutons sans passer par Redis ou la BDD.
 *
 * Usage :
 *   const { checkRateLimit } = require('../utils/rateLimit');
 *   if (checkRateLimit(userId, customId)) return; // trop rapide → ignorer
 */

const logger = require('../logs/logger');

const _store = new Map();

/**
 * Delays (ms) by customId prefix family.
 * Evaluated in order — first match wins.
 */
const RATE_FAMILIES = Object.freeze([
  { prefix: 'setup:finalize',         delay: 5000 },
  { prefix: 'setup:step:next',        delay: 2000 },
  { prefix: 'setup:newoptions:',      delay: 2000 },
  { prefix: 'setup:gamedetect:',      delay: 1500 },
  { prefix: 'setup:gamelink:',        delay: 1500 },
  { prefix: 'setup:channel:',         delay: 1500 },
  { prefix: 'setup:grade:',           delay: 1000 },
  { prefix: 'setup:games:page:',      delay: 600  },
  { prefix: 'setup:',                 delay: 800  },
]);

const DEFAULT_DELAY = 800;
const CLEANUP_INTERVAL_MS = 60_000;

function getDelay(customId) {
  for (const { prefix, delay } of RATE_FAMILIES) {
    if (customId.startsWith(prefix)) return delay;
  }
  return DEFAULT_DELAY;
}

/**
 * Returns true if the interaction should be BLOCKED (too fast).
 * Returns false if the interaction is allowed (first or spaced enough).
 *
 * @param {string} userId
 * @param {string} customId
 * @returns {boolean} blocked
 */
function checkRateLimit(userId, customId) {
  const key = `${userId}:${customId}`;
  const now = Date.now();
  const last = _store.get(key);
  const delay = getDelay(customId);

  if (last !== undefined && now - last < delay) {
    logger.debug(`[rateLimit] blocked user=${userId} customId=${customId} (${now - last}ms < ${delay}ms)`);
    return true;
  }

  _store.set(key, now);
  return false;
}

/**
 * Clears all entries older than the max known delay to prevent memory leaks.
 * Called automatically every CLEANUP_INTERVAL_MS.
 */
function cleanup() {
  const now = Date.now();
  const maxDelay = Math.max(...RATE_FAMILIES.map((f) => f.delay), DEFAULT_DELAY);
  for (const [key, ts] of _store.entries()) {
    if (now - ts > maxDelay * 2) {
      _store.delete(key);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL_MS).unref();

module.exports = { checkRateLimit, getDelay, RATE_FAMILIES };
