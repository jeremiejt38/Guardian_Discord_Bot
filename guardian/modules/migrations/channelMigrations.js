const { getGuildSetting, setGuildSetting } = require('../config/settings');
const logger = require('../logs/logger');

/**
 * Discord channel migrations — versioned, idempotent.
 *
 * Each migration has:
 *   - version: string semver (must be unique, applied in order)
 *   - description: human-readable
 *   - up(guild): async function that performs the Discord changes
 *
 * Rules:
 *   - Add new entries at the END only.
 *   - Never edit or remove existing entries.
 *   - Each migration is applied once per guild and tracked in guild_config
 *     under module='migrations', key='discord_version'.
 *
 * Idempotency: each up() must check if the action is still needed before
 * acting (e.g. check if old channel still exists before renaming).
 */
const CHANNEL_MIGRATIONS = [
  // ─── v1.0.0 → baseline, nothing to migrate (first tracked version) ────────
  {
    version: '1.0.0',
    description: 'Baseline — no Discord changes required',
    async up(_guild) {}
  },

  // ─── v1.1.0 → refacto channels modération + configuration (v0.26) ──────────
  {
    version: '1.1.0',
    description: 'Rename bot→notifications, channels→modules, logs-mod→validation',
    async up(guild) {
      const rename = async (oldName, newName) => {
        const ch = guild.channels.cache.find((c) => c.name === oldName && c.isTextBased?.());
        if (ch) await ch.setName(newName).catch(() => {});
      };
      await rename('bot', 'notifications');
      await rename('channels', 'modules');
      await rename('logs-mod', 'validation');
    }
  }

  // ─── Template for future migrations ─────────────────────────────────────────
  // {
  //   version: '1.1.0',
  //   description: 'Rename #bot to #statut-bot',
  //   async up(guild) {
  //     const ch = guild.channels.cache.find((c) => c.name === 'bot' && c.isTextBased?.());
  //     if (ch) await ch.setName('statut-bot').catch(() => {});
  //   }
  // },
  // {
  //   version: '1.2.0',
  //   description: 'Merge #config-jeux and #config-vocaux into #jeux-et-vocaux',
  //   async up(guild) {
  //     const jeux  = guild.channels.cache.find((c) => c.name === 'config-jeux');
  //     const vocaux = guild.channels.cache.find((c) => c.name === 'config-vocaux');
  //     // Create merged channel if neither of the targets exists yet
  //     const merged = guild.channels.cache.find((c) => c.name === 'jeux-et-vocaux');
  //     if (!merged) {
  //       await guild.channels.create({ name: 'jeux-et-vocaux', parent: jeux?.parentId ?? null }).catch(() => {});
  //     }
  //     if (jeux)  await jeux.delete('merged into jeux-et-vocaux').catch(() => {});
  //     if (vocaux) await vocaux.delete('merged into jeux-et-vocaux').catch(() => {});
  //   }
  // }
];

/**
 * Returns a comparable integer from a semver string.
 * e.g. '1.2.3' → 10203
 */
function semverToInt(v) {
  const [major = 0, minor = 0, patch = 0] = v.split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}

/**
 * Runs all pending Discord migrations for a guild.
 * @param {Guild} guild
 */
async function runChannelMigrations(guild) {
  const guildId = guild.id;
  const lastApplied = getGuildSetting(guildId, 'migrations', 'discord_applied_version', '0.0.0');
  const lastInt = semverToInt(lastApplied);

  const pending = CHANNEL_MIGRATIONS.filter((m) => semverToInt(m.version) > lastInt)
    .sort((a, b) => semverToInt(a.version) - semverToInt(b.version));

  if (pending.length === 0) return;

  logger.info(`Guild ${guildId}: ${pending.length} Discord migration(s) to apply`);

  for (const migration of pending) {
    try {
      await migration.up(guild);
      setGuildSetting(guildId, 'migrations', 'discord_applied_version', migration.version);
      logger.info(`Guild ${guildId}: Discord migration ${migration.version} applied — ${migration.description}`);
    } catch (e) {
      logger.error(`Guild ${guildId}: Discord migration ${migration.version} failed — ${migration.description}`, e);
      break;
    }
  }
}

/**
 * Records the install version when the bot is first set up on a guild.
 * Call this at the end of the setup wizard finalization.
 */
function recordInstallVersion(guildId, version) {
  const existing = getGuildSetting(guildId, 'migrations', 'discord_applied_version', null);
  if (!existing) {
    setGuildSetting(guildId, 'migrations', 'discord_applied_version', version);
  }
  const installVersion = getGuildSetting(guildId, 'bot', 'install_version', null);
  if (!installVersion) {
    setGuildSetting(guildId, 'bot', 'install_version', version);
  }
}

module.exports = { runChannelMigrations, recordInstallVersion, CHANNEL_MIGRATIONS };
