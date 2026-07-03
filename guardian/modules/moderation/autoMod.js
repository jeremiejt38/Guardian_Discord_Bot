const { saveSanction } = require('./moderation');

const windows = new Map();

async function evaluateSpam(message, limitCount = 5, periodMs = 3000) {
  const key = `${message.guildId}:${message.author.id}`;
  const now = Date.now();
  const existing = windows.get(key) || [];
  const recent = existing.filter((ts) => now - ts <= periodMs);
  recent.push(now);
  windows.set(key, recent);

  if (recent.length > limitCount) {
    await saveSanction({
      guildId: message.guildId,
      userId: message.author.id,
      type: 'warn',
      reason: 'Anti-spam trigger',
      appliedBy: message.client.user.id,
      auto: 1,
      guild: message.guild,
      member: message.member
    });
    return true;
  }

  return false;
}

module.exports = {
  evaluateSpam
};
