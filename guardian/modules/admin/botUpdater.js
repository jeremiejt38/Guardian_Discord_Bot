const { execFile } = require('child_process');
const path = require('path');
const logger = require('../logs/logger');

const BOT_ADMIN_ID = process.env.BOT_ADMIN_ID ?? null;
const ROOT_DIR = path.resolve(__dirname, '../../');

function getBotAdminId() {
  return BOT_ADMIN_ID;
}

function isBotAdmin(userId) {
  if (!BOT_ADMIN_ID) return false;
  return userId === BOT_ADMIN_ID;
}

function isRunningUnderPM2() {
  return Boolean(process.env.PM2_HOME || process.env.pm_id !== undefined);
}

async function notifyBotAdminUpdate(client, fromVersion, toVersion) {
  if (!BOT_ADMIN_ID) return;
  try {
    const adminUser = await client.users.fetch(BOT_ADMIN_ID).catch(() => null);
    if (!adminUser) {
      logger.warn(`botUpdater: BOT_ADMIN_ID=${BOT_ADMIN_ID} introuvable sur Discord`);
      return;
    }

    const pm2Running = isRunningUnderPM2();
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const msg = [
      `## 🔄 Nouvelle version Guardian disponible — v${fromVersion} → **v${toVersion}**`,
      ``,
      `> Tu reçois ce message car tu es l'administrateur bot (\`BOT_ADMIN_ID\`).`,
      ``,
      `**Que souhaites-tu faire ?**`,
      pm2Running
        ? `> ✅ PM2 détecté — le bot redémarrera automatiquement après la mise à jour.`
        : `> ⚠️ PM2 non détecté — tu devras redémarrer le bot manuellement après la mise à jour.`,
      ``,
      `📋 Changelog : https://github.com/jeremiejt38/Guardian_Discord_Bot/releases`
    ].join('\n');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bot:admin:update:confirm`)
        .setLabel('🚀 Mettre à jour maintenant')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`bot:admin:update:skip`)
        .setLabel('⏭️ Ignorer')
        .setStyle(ButtonStyle.Secondary)
    );

    await adminUser.send({ content: msg, components: [row] });
    logger.info(`botUpdater: notification MAJ envoyée à BOT_ADMIN_ID=${BOT_ADMIN_ID}`);
  } catch (err) {
    logger.error('botUpdater: erreur notification admin', err);
  }
}

async function performUpdate(interaction) {
  if (!isBotAdmin(interaction.user.id)) {
    await interaction.reply({ content: '❌ Tu n\'es pas autorisé à effectuer cette action.', ephemeral: true }).catch(() => {});
    return;
  }

  await interaction.deferUpdate().catch(() => {});

  const pm2Running = isRunningUnderPM2();

  const updating = [
    `## ⏳ Mise à jour en cours…`,
    ``,
    `\`git pull\` + \`npm install\` en cours d'exécution.`,
    pm2Running
      ? `> Le bot redémarrera automatiquement via PM2 dans quelques secondes.`
      : `> ⚠️ Redémarre le bot manuellement une fois la mise à jour terminée.`
  ].join('\n');

  await interaction.message?.edit({ content: updating, components: [] }).catch(() => {});

  execFile('git', ['pull', '--ff-only'], { cwd: ROOT_DIR }, (gitErr, gitOut, gitStderr) => {
    if (gitErr) {
      logger.error('botUpdater: git pull échoué', gitErr);
      interaction.message?.edit({
        content: `## ❌ Échec git pull\n\`\`\`\n${gitStderr || gitErr.message}\n\`\`\``,
        components: []
      }).catch(() => {});
      return;
    }

    logger.info(`botUpdater: git pull OK\n${gitOut}`);

    execFile('npm', ['install', '--omit=dev'], { cwd: ROOT_DIR }, (npmErr, npmOut, npmStderr) => {
      if (npmErr) {
        logger.error('botUpdater: npm install échoué', npmErr);
        interaction.message?.edit({
          content: `## ❌ Échec npm install\n\`\`\`\n${npmStderr || npmErr.message}\n\`\`\``,
          components: []
        }).catch(() => {});
        return;
      }

      logger.info(`botUpdater: npm install OK`);

      const done = pm2Running
        ? `## ✅ Mise à jour appliquée — redémarrage PM2 dans 3s…`
        : `## ✅ Mise à jour appliquée\n\n> Redémarre le bot manuellement pour appliquer les changements.`;

      interaction.message?.edit({ content: done, components: [] }).catch(() => {});

      if (pm2Running) {
        setTimeout(() => process.exit(0), 3000);
      }
    });
  });
}

module.exports = { getBotAdminId, isBotAdmin, isRunningUnderPM2, notifyBotAdminUpdate, performUpdate };
