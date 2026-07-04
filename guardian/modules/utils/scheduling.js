function createGuildRunTracker() {
  const lastRunByGuild = new Map();

  return {
    shouldRun(guildId, nowMs, intervalMinutes) {
      const last = lastRunByGuild.get(guildId) || 0;
      return nowMs - last >= intervalMinutes * 60 * 1000;
    },
    markRun(guildId, nowMs) {
      lastRunByGuild.set(guildId, nowMs);
    }
  };
}

module.exports = { createGuildRunTracker };
