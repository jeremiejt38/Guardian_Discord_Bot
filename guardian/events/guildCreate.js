const { isGuildInstalled } = require('../modules/initialisation/checkInstall');
const { createSetupArea, ensureSetupInstallPrompt } = require('../modules/initialisation/setup');
const { applyPersistedSlowModeForGuild } = require('../modules/moderation/autoMod');
const { ensureMemberGameInterfaces } = require('../modules/config/settings');
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'guildCreate',
  once: false,
  async execute(client, guild) {
    logger.info(`Bot added to guild: ${guild.name} (${guild.id})`);
    try {
      const installed = isGuildInstalled(guild.id);
      if (!installed) {
        await createSetupArea(guild);
      }
      await ensureSetupInstallPrompt(guild, { forceCreateIfMissing: !installed || true });
      await applyPersistedSlowModeForGuild(guild);
      await ensureMemberGameInterfaces(guild);
    } catch (error) {
      logger.error(`Failed guildCreate setup for guild ${guild.id}`, error);
    }
  }
};
