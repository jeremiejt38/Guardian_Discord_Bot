const test = require('node:test');
const assert = require('node:assert/strict');

const { createGuildRunTracker } = require('../modules/utils/scheduling');

test('createGuildRunTracker gates runs by interval and is per-guild', () => {
  const tracker = createGuildRunTracker();
  const intervalMinutes = 10;
  const intervalMs = intervalMinutes * 60 * 1000;
  const start = 1_000_000_000;

  // Never run before: should run immediately.
  assert.equal(tracker.shouldRun('g1', start, intervalMinutes), true);

  tracker.markRun('g1', start);

  // Just after marking: within the interval, should not run.
  assert.equal(tracker.shouldRun('g1', start + 1, intervalMinutes), false);
  assert.equal(tracker.shouldRun('g1', start + intervalMs - 1, intervalMinutes), false);

  // Exactly at / past the interval boundary: should run again.
  assert.equal(tracker.shouldRun('g1', start + intervalMs, intervalMinutes), true);
  assert.equal(tracker.shouldRun('g1', start + intervalMs + 5000, intervalMinutes), true);

  // A different guild is tracked independently.
  assert.equal(tracker.shouldRun('g2', start + 1, intervalMinutes), true);
});

test('createGuildRunTracker instances do not share state', () => {
  const a = createGuildRunTracker();
  const b = createGuildRunTracker();
  const start = 1_000_000_000;

  a.markRun('g1', start);

  // Same guild id, just after marking: tracker `a` gates it, tracker `b` does not.
  assert.equal(a.shouldRun('g1', start + 500, 10), false);
  assert.equal(b.shouldRun('g1', start + 500, 10), true);
});
