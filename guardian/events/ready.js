const { isGuildInstalled } = require('../modules/initialisation/checkInstall');
const { createSetupArea, ensureSetupInstallPrompt } = require('../modules/initialisation/setup');
const { startInviteExpulsionJob } = require('../modules/members/expulsion');
const { startChangelogTimer } = require('../modules/games/gamesNotification');
const { startServerMonitor } = require('../modules/servers/serverMonitor');
const { applyPersistedSlowModeForGuild } = require('../modules/moderation/autoMod');
const { ensureMemberGameInterfaces } = require('../modules/config/settings');
const { runPassiveScoreRegen } = require('../modules/moderation/behavior');
const { seedGuildMessages } = require('../modules/initialisation/seeds');
const { refreshStatusBotPanel } = require('../modules/config/statusBotPanel');
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Connected as ${client.user.tag}`);

    for (const guild of client.guilds.cache.values()) {
      try {
        if (!isGuildInstalled(guild.id)) {
          await createSetupArea(guild);
        }

        await ensureSetupInstallPrompt(guild);

        await applyPersistedSlowModeForGuild(guild);
        await ensureMemberGameInterfaces(guild);
        await refreshStatusBotPanel(guild).catch(() => undefined);
        await seedGuildMessages(guild).catch(() => undefined);
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
