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
const { getInstallContext } = require('../modules/initialisation/detectInstallContext');
const { CATEGORIES, CHANNELS } = require('../config');
const { findCategoryByName, findGuildTextChannelByName } = require('../modules/utils/channels');
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

        const context = getInstallContext(guild);
        if (context === 'guardian_partial') {
          const ownerId = getGuildSetting(guild.id, 'setup', 'owner_id', null)
            ?? getGuildSetting(guild.id, 'setup', 'inviter_id', null)
            ?? guild.ownerId;
          const ownerUser = await client.users.fetch(ownerId).catch(() => null);
          if (ownerUser) {
            const setupCategory = findCategoryByName(guild, CATEGORIES.setup);
            const setupChannel = setupCategory
              ? findGuildTextChannelByName(guild, CHANNELS.setup, setupCategory.id)
              : null;
            const setupLink = setupChannel
              ? `https://discord.com/channels/${guild.id}/${setupChannel.id}`
              : null;
            const msg = [
              `## ⚙️ Guardian reconnecté — configuration en cours`,
              ``,
              `Guardian vient d'être reconnecté sur **${guild.name}** et a détecté une configuration incomplète.`,
              ``,
              `> Pour finaliser l'installation, reprends la configuration là où tu t'es arrêté.`,
              setupLink ? `\n🔗 **[Reprendre la configuration](${setupLink})**` : `\n> Rends-toi dans le channel **#${CHANNELS.setup}** sur ton serveur.`
            ].join('\n');
            await ownerUser.send(msg).catch(() =>
              logger.warn(`Ready: could not send setup_incomplete DM to ${ownerId} for guild ${guild.id}`)
            );
            logger.info(`Guild ${guild.id}: setup_incomplete DM sent to ${ownerId}`);
          }
        }

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
