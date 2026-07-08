'use strict';

/**
 * setupSecurity.js
 * Helpers sécurité rôles extraits de setupFlow.js.
 * Dépend de setupRender pour buildStepPayload — pas de cycle.
 */

const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const { hasUnresolvedIssues } = require('./roleSecurityCheck');
const { CUSTOM_IDS } = require('./setupConstants');
const { t } = require('../../locales');
const logger = require('../logs/logger');

// ─── explainStepOneValidation ─────────────────────────────────────────────────

function explainStepOneValidation(guildId, validation, gradeLabelFn) {
  if (validation.reason === 'missing_mappings') {
    const missing = validation?.details?.missingGrades || [];
    return t('setup.validationMissingMappings', { grades: missing.map(gradeLabelFn).join(', ') }, { guildId });
  }
  if (validation.reason === 'duplicate_roles') return t('setup.validationDuplicateRoles', {}, { guildId });
  if (validation.reason === 'owner_role_missing') return t('setup.validationOwnerRoleMissing', {}, { guildId });
  if (validation.reason === 'owner_cardinality') return t('setup.validationOwnerCardinality', { count: validation?.details?.ownerCount ?? 0 }, { guildId });
  return t('setup.validationGenericError', {}, { guildId });
}

// ─── advanceToStep2AfterSecurity ─────────────────────────────────────────────

async function advanceToStep2AfterSecurity(interaction, guildId, buildStepPayloadFn) {
  const nextStep = 2;
  setGuildSetting(guildId, 'setup', 'step', nextStep);
  await interaction.message.delete().catch(() => {});
  const wizardChannel = interaction.channel;
  if (!wizardChannel) return;
  const msgs = await wizardChannel.messages.fetch({ limit: 20 }).catch(() => null);
  if (!msgs) return;
  const botId = interaction.client.user.id;
  const wizardMsg = msgs.find((m) => m.author.id === botId && m.components.length > 0)
    ?? msgs.find((m) => m.author.id === botId);
  if (wizardMsg) {
    await wizardMsg.edit(buildStepPayloadFn(guildId, interaction.guild, nextStep)).catch((err) => {
      logger.warn(`[security] failed to edit wizardMsg: ${err?.message}`);
    });
  } else {
    logger.warn('[security] no wizardMsg found, sending new');
    await wizardChannel.send(buildStepPayloadFn(guildId, interaction.guild, nextStep)).catch(() => {});
  }
}

// ─── buildSecurityComponents ──────────────────────────────────────────────────

function buildSecurityComponents(dangerous, unused, _, resolvedIds = new Set()) {
  const rows = [];
  const allResolved = !hasUnresolvedIssues(dangerous, unused, resolvedIds);
  const unusedSlot = unused.length > 0 ? 1 : 0;
  const dangerousSlots = Math.min(dangerous.length, 4 - unusedSlot);

  for (const r of dangerous.slice(0, dangerousSlots)) {
    const resolved = resolvedIds.has(r.id);
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${CUSTOM_IDS.securityRoleAction}:${r.id}`)
        .setLabel(resolved ? `🟢 Réglé — @${r.name}`.slice(0, 80) : `🔐 Régler le problème — @${r.name}`.slice(0, 80))
        .setStyle(resolved ? ButtonStyle.Success : ButtonStyle.Danger)
        .setDisabled(resolved)
    ));
  }

  if (unused.length === 1) {
    const r = unused[0];
    const resolved = resolvedIds.has(r.id);
    if (!resolved) {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_IDS.securityDeleteUnused}:${r.id}`)
          .setLabel(_('roleSecurity.btnDelete', { name: r.name }).slice(0, 40))
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`${CUSTOM_IDS.securityKeepUnused}:${r.id}`)
          .setLabel(_('roleSecurity.btnKeep', { name: r.name }).slice(0, 40))
          .setStyle(ButtonStyle.Secondary)
      ));
    }
  } else if (unused.length > 1) {
    const allUnusedResolved = unused.every((r) => resolvedIds.has(r.id));
    if (!allUnusedResolved) {
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.securityDeleteAllUnused)
          .setLabel(_('roleSecurity.btnDeleteAll', { count: unused.length }).slice(0, 80))
          .setStyle(ButtonStyle.Danger)
      ));
    }
  }

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.securityContinue)
      .setLabel(allResolved ? '✅ Continuer' : _('roleSecurity.btnContinue'))
      .setStyle(allResolved ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(false)
  ));

  return rows;
}

module.exports = { explainStepOneValidation, advanceToStep2AfterSecurity, buildSecurityComponents };
