const { isGuildInstalled } = require('../modules/initialisation/checkInstall');
const { createSetupArea } = require('../modules/initialisation/setup');
const { startInviteExpulsionJob } = require('../modules/members/expulsion');
const { startChangelogTimer } = require('../modules/games/gamesNotification');
const { startServerMonitor } = require('../modules/servers/serverMonitor');
const { ensureGameOptInPanelsForGuild } = require('../modules/games/optInInteraction');
const { ensureServerGamesPanelForGuild } = require('../modules/games/serverGamesManager');
const { ensureTempVoicePanelForGuild } = require('../modules/games/tempVoiceInteraction');
const { cleanupStaleTempVoices } = require('../modules/games/gamesVocal');
const { ensureReportPanelForGuild } = require('../modules/moderation/reports');
const { ensureConfigPanelsForGuild } = require('../modules/config/settings');
const { provisionGuildStructure } = require('../modules/initialisation/provision');
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
        } else {
          await provisionGuildStructure(guild);
          await ensureGameOptInPanelsForGuild(guild);
          await ensureServerGamesPanelForGuild(guild);
          await ensureTempVoicePanelForGuild(guild);
          await ensureReportPanelForGuild(guild);
          await ensureConfigPanelsForGuild(guild);
        }
      } catch (error) {
        logger.error(`Failed ready setup check for guild ${guild.id}`, error);
      }
    }

    await cleanupStaleTempVoices(client).catch((error) => {
      logger.error('Failed stale temporary voice cleanup', error);
    });

    startInviteExpulsionJob(client);
    startChangelogTimer(client);
    startServerMonitor(client);
  }
};
