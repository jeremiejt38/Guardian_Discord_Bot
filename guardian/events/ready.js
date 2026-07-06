const { isGuildInstalled } = require('../modules/initialisation/checkInstall');
const { createSetupArea, ensureSetupInstallPrompt } = require('../modules/initialisation/setup');
const { startInviteExpulsionJob } = require('../modules/members/expulsion');
const { startChangelogTimer } = require('../modules/games/gamesNotification');
const { startServerMonitor } = require('../modules/servers/serverMonitor');
const { applyPersistedSlowModeForGuild } = require('../modules/moderation/autoMod');
const { ensureMemberGameInterfaces } = require('../modules/config/settings');
const { runPassiveScoreRegen } = require('../modules/moderation/behavior');
const { seedGuildMessages } = require('../modules/initialisation/seeds');
const { sendDmNotification } = require('../modules/notifications/dmNotifier');
const { getGuildSetting, setGuildSetting } = require('../modules/config/settings');
const { runChannelMigrations } = require('../modules/migrations/channelMigrations');
const { restoreConfigFromBackup, saveConfigBackup } = require('../modules/config/configBackup');
const logger = require('../modules/logs/logger');
const { version } = require('../package.json');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(`Connected as ${client.user.tag}`);

    for (const guild of client.guilds.cache.values()) {
      try {
        const alreadyInstalled = isGuildInstalled(guild.id);

        if (!alreadyInstalled) {
          const restored = await restoreConfigFromBackup(guild);
          if (restored) {
            logger.info(`Guild ${guild.id}: config restored from backup — skipping full setup area creation`);
          } else {
            await createSetupArea(guild);
          }
        }

        await ensureSetupInstallPrompt(guild, { forceCreateIfMissing: true });

        await applyPersistedSlowModeForGuild(guild);
        await ensureMemberGameInterfaces(guild);
        await seedGuildMessages(guild).catch(() => undefined);

        await runChannelMigrations(guild);

        const lastVersion = getGuildSetting(guild.id, 'bot', 'last_version', null);
        if (lastVersion && lastVersion !== version) {
          const msg = [
            `## 🔄 Guardian mis à jour — v${lastVersion} → **v${version}**`,
            ``,
            `> Le bot vient de redémarrer sur **${guild.name}** avec une nouvelle version.`,
            `> Aucune action requise — la configuration est préservée.`,
            ``,
            `📋 Consulte le changelog complet : https://github.com/jeremiejt38/Guardian_Discord_Bot/releases`
          ].join('\n');
          await sendDmNotification(guild, 'bot_update', msg);
          logger.info(`Bot update notified for guild ${guild.id}: ${lastVersion} → ${version}`);
        }
        setGuildSetting(guild.id, 'bot', 'last_version', version);

        await saveConfigBackup(guild).catch(() => {});
      } catch (error) {
        logger.error(`Failed ready setup check for guild ${guild.id}`, error);
      }
    }

    startInviteExpulsionJob(client);
    startChangelogTimer();
    startServerMonitor(60 * 1000);
    setInterval(() => runPassiveScoreRegen(client).catch((err) => logger.error('Passive regen error', err)), 60 * 60 * 1000);
    runPassiveScoreRegen(client).catch((err) => logger.error('Passive regen error', err));
  }
};
