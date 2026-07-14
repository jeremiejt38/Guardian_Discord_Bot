'use strict';

/**
 * setupRender.js
 * Fonctions de rendu extraites de setupFlow.js :
 * sendSetupMessage, buildStepPayload, renderStep, startWizardInChannel.
 * Ce module est self-contained : il n'importe pas setupFlow.js (pas de cycle).
 */

const { getGuildSetting, setGuildSetting } = require('../config/settings');
const { replyEphemeral } = require('../utils/interactions');
const { getGradeMappings } = require('./gradeMapping');
const { autoMapRolesByName } = require('./detectInstallContext');
const { detectExistingGameChannels, setDetectedGames } = require('./setupGamesDetect');
const logger = require('../logs/logger');

// ─── sendSetupMessage ─────────────────────────────────────────────────────────

async function sendSetupMessage(interaction, content) {
  if (interaction.channel?.send) {
    await interaction.channel.send({ content });
    await interaction.deferUpdate().catch(() => {});
  } else {
    await replyEphemeral(interaction, content);
  }
}

// ─── buildStepPayload ─────────────────────────────────────────────────────────
// ctx est l'objet retourné par _ctx() dans setupFlow.js

function buildStepPayload(guildId, guild, step, ctx) {
  function pad(content) { return content + '\n\u200b'; }
  const s = require('./setupSteps');
  switch (step) {
    case 1: return { content: pad(s.buildStepOneContent(guildId, guild, ctx)), components: s.buildStepOneComponents(guildId, guild, ctx) };
    case 2: return { content: pad(s.buildStep2Content(guildId, guild, ctx)), components: s.buildStep2Components(guildId, guild, ctx) };
    case 3: return { content: pad(s.buildStep3ChannelsContent(guildId, guild, ctx)), components: s.buildStep3ChannelsComponents(guildId, guild, ctx) };
    case 4: return { content: pad(s.buildStep4Content(guildId, guild, ctx)), components: s.buildStep4Components(guildId, guild, ctx) };
    case 5: return { content: pad(s.buildStep5VocalContent(guildId, ctx)), components: s.buildStep5VocalComponents(guildId, ctx) };
    case 6: return { content: pad(s.buildStep6Content_Games(guildId, ctx)), components: s.buildStep6Components_Games(guildId, ctx) };
    case 7: return { content: pad(s.buildStep7Content(guildId, ctx)), components: s.buildStep7Components(guildId, ctx) };
    // @premium-start
    case 8: return { content: pad('## \ud83d\udd27 Param\u00e8tres Discord avanc\u00e9s (8/9)\n*Chargement...*'), components: [] };
    // @premium-end
    default: return { content: pad(s.buildStep9Summary(guildId, ctx)), components: s.buildStep9Components(guildId, ctx) };
  }
}

// ─── renderStep ───────────────────────────────────────────────────────────────

async function renderStep(interaction, step, ctx) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  // @premium-start
  if (step === 8) {
    try {
      await interaction.deferUpdate().catch(() => {});
      const s = require('./setupSteps');
      const content = await s.buildStep8DiscordContent(guildId, guild, ctx);
      const components = await s.buildStep8DiscordComponents(guildId, guild, ctx);
      await interaction.message.edit({ content: content + '\n\u200b', components }).catch(async () => {
        await interaction.channel?.send({ content: content + '\n\u200b', components }).catch(() => {});
      });
    } catch (err) {
      logger.error('renderStep 8 failed', err);
    }
    return;
  }
  // @premium-end
  const payload = buildStepPayload(guildId, guild, step, ctx);
  try {
    await interaction.message.edit(payload);
    await interaction.deferUpdate().catch(() => {});
  } catch (err) {
    if (err.code === 10008 && interaction.channel?.send) {
      await interaction.channel.send(payload);
      await interaction.deferUpdate().catch(() => {});
    } else {
      throw err;
    }
  }
}

// ─── startWizardInChannel ─────────────────────────────────────────────────────

async function startWizardInChannel(interaction, ctx) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  const { TOTAL_STEPS } = require('./setupConstants');
  const savedStep = Number(getGuildSetting(guildId, 'setup', 'step', 0));
  const step = (savedStep >= 1 && savedStep <= TOTAL_STEPS) ? savedStep : 1;
  if (step === 1) {
    setGuildSetting(guildId, 'setup', 'step', 1);
    ctx.setGradeCursor(guildId, 0);
    // Auto-map des rôles existants si aucun mapping n'est défini
    const mappings = getGradeMappings(guildId);
    const hasAnyMapping = Object.values(mappings).some(Boolean);
    if (!hasAnyMapping) {
      try {
        const mapped = await autoMapRolesByName(guild);
        if (Object.keys(mapped).length > 0) {
          logger.info('[setupRender] autoMapRolesByName mapped', { guildId, mapped });
        }
      } catch (err) {
        logger.error('[setupRender] autoMapRolesByName failed', err);
      }
    }
    // Pré-détection des jeux en background pour accélérer le step 6
    try {
      const existing = getGuildSetting(guildId, 'setup', 'detected_games', null);
      if (!existing) {
        const games = detectExistingGameChannels(guild);
        setDetectedGames(guildId, games);
        logger.info('[setupRender] pre-detected games', { guildId, count: games.length });
      }
    } catch (err) {
      logger.error('[setupRender] game pre-detection failed', err);
    }
  } else if (step === 3) {
    const slots = ctx.getActiveSlotsForInstall(guildId, guild);
    const anyConfigured = slots.some((s) => getGuildSetting(guildId, s.settingSection, s.settingKey, null));
    if (anyConfigured) {
      ctx.autoPositionChannelCursor(guildId, guild);
    } else {
      ctx.setChannelCursor(guildId, 0);
    }
  }
  const payload = buildStepPayload(guildId, guild, step, ctx);
  try {
    await interaction.message.edit(payload);
    await interaction.deferUpdate().catch(() => {});
  } catch (err) {
    if (err.code === 10008 && interaction.channel?.send) {
      await interaction.channel.send(payload);
      await interaction.deferUpdate().catch(() => {});
    } else {
      throw err;
    }
  }
}

module.exports = { sendSetupMessage, buildStepPayload, renderStep, startWizardInChannel };
