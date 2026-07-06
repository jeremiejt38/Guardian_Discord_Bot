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
      let setupChannel = null;
      if (!installed) {
        const result = await createSetupArea(guild, { inviterId });
        setupChannel = result?.channel ?? null;
      }

      if (!installed) {
        const dmTargetId = inviterId ?? guild.ownerId;
        try {
          const dmTarget = await client.users.fetch(dmTargetId).catch(() => null);
          if (dmTarget) {
            const channelLink = setupChannel
              ? `https://discord.com/channels/${guild.id}/${setupChannel.id}`
              : null;
            await dmTarget.send({
              content: [
                `## 👋 Guardian has been added to **${guild.name}**!`,
                '',
                `Thanks for inviting Guardian. A private setup channel has been created just for you.`,
                channelLink
                  ? `\n➡️ **Start the setup here:** ${channelLink}`
                  : `\n➡️ Look for the **#setup** channel in your server to get started.`,
                '',
                `> The setup channel is only visible to you and the server owner.`,
                `> It takes about 5 minutes to configure Guardian for your server.`
              ].join('\n')
            });
            logger.info(`Guild ${guild.id}: DM sent to inviter/owner ${dmTargetId}`);
          }
        } catch (err) {
          logger.warn(`Guild ${guild.id}: could not send DM to inviter/owner ${dmTargetId} — ${err?.message}`);
        }
      }

      await ensureSetupInstallPrompt(guild, { forceCreateIfMissing: !installed || true });
      await applyPersistedSlowModeForGuild(guild);
      await ensureMemberGameInterfaces(guild);
    } catch (error) {
      logger.error(`Failed guildCreate setup for guild ${guild.id}`, error);
    }
  }
};
