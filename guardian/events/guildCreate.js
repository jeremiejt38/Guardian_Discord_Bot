const { AuditLogEvent } = require('discord.js');
const { isGuildInstalled } = require('../modules/initialisation/checkInstall');
const { createSetupArea, ensureSetupInstallPrompt } = require('../modules/initialisation/setup');
const { applyPersistedSlowModeForGuild } = require('../modules/moderation/autoMod');
const { ensureMemberGameInterfaces } = require('../modules/config/settings');
const { setGuildSetting } = require('../modules/config/settings');
const logger = require('../modules/logs/logger');

async function detectInviter(guild) {
  try {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 });
    const entry = logs.entries.find(
      (e) => e.target?.id === guild.client.user.id
    );
    return entry?.executor?.id ?? null;
  } catch {
    return null;
  }
}

module.exports = {
  name: 'guildCreate',
  once: false,
  async execute(client, guild) {
    logger.info(`Bot added to guild: ${guild.name} (${guild.id})`);
    try {
      const installed = isGuildInstalled(guild.id);
      const inviterId = await detectInviter(guild);
      if (inviterId) {
        setGuildSetting(guild.id, 'setup', 'inviter_id', inviterId);
        logger.info(`Guild ${guild.id}: inviter detected — ${inviterId}`);
      }
      if (!installed) {
        await createSetupArea(guild, { inviterId });
      }
      await ensureSetupInstallPrompt(guild, { forceCreateIfMissing: !installed || true });
      await applyPersistedSlowModeForGuild(guild);
      await ensureMemberGameInterfaces(guild);
    } catch (error) {
      logger.error(`Failed guildCreate setup for guild ${guild.id}`, error);
    }
  }
};
