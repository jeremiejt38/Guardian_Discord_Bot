const { AuditLogEvent } = require('discord.js');
const { isGuildInstalled } = require('../modules/initialisation/checkInstall');
const { createSetupArea, ensureSetupInstallPrompt } = require('../modules/initialisation/setup');
const { applyPersistedSlowModeForGuild } = require('../modules/moderation/autoMod');
const { ensureMemberGameInterfaces } = require('../modules/config/settings');
const { setGuildSetting, getGuildSetting } = require('../modules/config/settings');
const { detectLanguageFromLocale, tForLanguage } = require('../modules/i18n');
const logger = require('../modules/logs/logger');
const { alertGuildJoin } = require('../modules/admin/adminAlerts');

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
    await alertGuildJoin(guild).catch(() => {});
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
        const lang = detectLanguageFromLocale(guild.preferredLocale);
        const _ = (key, vars) => tForLanguage(lang, `guildCreate.${key}`, vars);
        try {
          const dmTarget = await client.users.fetch(dmTargetId).catch(() => null);
          if (dmTarget) {
            const channelLink = setupChannel
              ? `https://discord.com/channels/${guild.id}/${setupChannel.id}`
              : null;
            await dmTarget.send({
              content: [
                `## ${_('dmTitle', { guildName: guild.name })}`,
                '',
                _('dmBody'),
                channelLink
                  ? `\n${_('dmLink', { link: channelLink })}`
                  : `\n${_('dmLinkFallback')}`,
                '',
                _('dmFooter1'),
                _('dmFooter2')
              ].join('\n')
            });
            logger.info(`Guild ${guild.id}: DM sent to inviter/owner ${dmTargetId} (lang: ${lang})`);
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
