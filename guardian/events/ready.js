const { isGuildInstalled } = require('../modules/initialisation/checkInstall');
const { createSetupArea, ensureSetupInstallPrompt } = require('../modules/initialisation/setup');
const { startInviteExpulsionJob } = require('../modules/members/expulsion');
const { startChangelogTimer } = require('../modules/games/gamesNotification');
const { startServerMonitor } = require('../modules/servers/serverMonitor');
const { applyPersistedSlowModeForGuild } = require('../modules/moderation/autoMod');
const { ensureMemberGameInterfaces } = require('../modules/config/settings');
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
      } catch (error) {
        logger.error(`Failed ready setup check for guild ${guild.id}`, error);
      }
    }

    startInviteExpulsionJob(client);
    startChangelogTimer(client);
    // run server monitor every 60s for responsive server status updates
    startServerMonitor(client, 60 * 1000);
  }
};
