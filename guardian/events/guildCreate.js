const { isGuildInstalled } = require('../modules/initialisation/checkInstall');
const { createSetupArea, ensureSetupInstallPrompt } = require('../modules/initialisation/setup');
const { applyPersistedSlowModeForGuild } = require('../modules/moderation/autoMod');
const { ensureMemberGameInterfaces } = require('../modules/config/settings');
const { findGuildTextChannelByName } = require('../modules/utils/channels');
const { CHANNELS } = require('../config');
const logger = require('../modules/logs/logger');

module.exports = {
  name: 'guildCreate',
  once: false,
  async execute(client, guild) {
    logger.info(`Bot added to guild: ${guild.name} (${guild.id})`);
    try {
      await guild.channels.fetch().catch(() => {});
      const setupChannelExists = !!findGuildTextChannelByName(guild, CHANNELS.setup);
      if (!isGuildInstalled(guild.id) || !setupChannelExists) {
        await createSetupArea(guild);
      }
      await ensureSetupInstallPrompt(guild);
      await applyPersistedSlowModeForGuild(guild);
      await ensureMemberGameInterfaces(guild);
    } catch (error) {
      logger.error(`Failed guildCreate setup for guild ${guild.id}`, error);
    }
  }
};
