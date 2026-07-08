'use strict';

/**
 * setupGrades.js
 * Helpers grades/rôles extraits de setupFlow.js.
 * Pas de dépendance vers setupFlow.js — aucun cycle.
 */

const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { GRADE_NAMES } = require('../../config');
const { getGuildSetting, setGuildSetting } = require('../config/settings');
const { ORDERED_GRADES } = require('./gradeMapping');
const { setGradeRole, getGradeMappings } = require('./gradeMapping');
const { CUSTOM_IDS, TOTAL_STEPS } = require('./setupConstants');
const { t } = require('../../locales');
const logger = require('../logs/logger');

// ─── Labels ───────────────────────────────────────────────────────────────────

const GRADE_LABELS = Object.freeze({
  [GRADE_NAMES.invite]: 'Invite',
  [GRADE_NAMES.membre]: 'Membre',
  [GRADE_NAMES.moderateur]: 'Moderateur',
  [GRADE_NAMES.manager]: 'Manager',
  [GRADE_NAMES.owner]: 'Owner',
});

function gradeLabel(gradeName) {
  return GRADE_LABELS[gradeName] || gradeName;
}

// ─── Curseur grade ────────────────────────────────────────────────────────────

function getGradeCursor(guildId) {
  const cursor = getGuildSetting(guildId, 'setup', 'grade_cursor', 0);
  if (!Number.isInteger(cursor)) return 0;
  return Math.min(Math.max(cursor, 0), ORDERED_GRADES.length - 1);
}

function setGradeCursor(guildId, cursor) {
  const safeCursor = Math.min(Math.max(cursor, 0), ORDERED_GRADES.length - 1);
  setGuildSetting(guildId, 'setup', 'grade_cursor', safeCursor);
  return safeCursor;
}

// ─── Step courant ─────────────────────────────────────────────────────────────

function getCurrentStep(guildId) {
  const step = getGuildSetting(guildId, 'setup', 'step', 1);
  return Number.isInteger(step) ? step : 1;
}

// ─── Utilitaires affichage ────────────────────────────────────────────────────

function boolText(value, guildId) {
  return value ? t('setup.enabled', {}, { guildId }) : t('setup.disabled', {}, { guildId });
}

function onOff(flag) { return flag ? '🟢 Actif' : '🔴 Inactif'; }
function onOffDot(flag) { return flag ? '🟢' : '🔴'; }

// ─── Barre de navigation ──────────────────────────────────────────────────────

function buildNavRow(guildId, step) {
  const isLastStep = step >= TOTAL_STEPS;
  const buttons = [];
  if (step > 1) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.back)
        .setStyle(ButtonStyle.Secondary)
        .setLabel('◀ ' + t('setup.backStep', {}, { guildId }))
    );
  }
  if (!isLastStep) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.next)
        .setStyle(ButtonStyle.Primary)
        .setLabel(t('setup.nextStep', {}, { guildId }) + ' ▶')
    );
  } else {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.finalize)
        .setStyle(ButtonStyle.Success)
        .setLabel('🚀 ' + t('setup.finalizeButton', {}, { guildId }))
    );
  }
  return new ActionRowBuilder().addComponents(buttons);
}

// ─── Options rôles ────────────────────────────────────────────────────────────

function buildRoleOptions(guild, selectedRoleId) {
  const roleList = guild.roles.cache
    .filter((role) => role.id !== guild.id && !role.managed)
    .sort((a, b) => b.position - a.position)
    .first(24)
    .map((role) => ({ label: role.name.slice(0, 100), value: role.id, default: false }));

  if (selectedRoleId && !roleList.find((o) => o.value === selectedRoleId)) {
    const selectedRole = guild.roles.cache.get(selectedRoleId);
    if (selectedRole) roleList.unshift({ label: selectedRole.name.slice(0, 100), value: selectedRole.id, default: false });
  }

  return [{ label: '— Effacer la sélection', value: 'none', description: 'Désassigner ce grade', default: false }, ...roleList].slice(0, 25);
}

function hasMapableRoles(guild) {
  return guild.roles.cache.some((role) => role.id !== guild.roles.everyone.id && !role.managed);
}

// ─── Grade rename map ─────────────────────────────────────────────────────────

function getRolesAutoCreated(guildId) {
  return Boolean(getGuildSetting(guildId, 'setup', 'roles_auto_created', false));
}

function getGradeRenameMap(guildId) {
  const stored = getGuildSetting(guildId, 'setup', 'grade_rename_map', {});
  return stored && typeof stored === 'object' ? stored : {};
}

function setGradeRenameName(guildId, grade, name) {
  const map = getGradeRenameMap(guildId);
  map[grade] = name;
  setGuildSetting(guildId, 'setup', 'grade_rename_map', map);
}

function isFreshInstall(guildId) {
  return Boolean(getGuildSetting(guildId, 'setup', 'fresh_install', false));
}

// ─── Couleurs par défaut ──────────────────────────────────────────────────────

const ROLE_COLORS = Object.freeze({
  [GRADE_NAMES.invite]: 0x95a5a6,
  [GRADE_NAMES.membre]: 0x3498db,
  [GRADE_NAMES.moderateur]: 0x2ecc71,
  [GRADE_NAMES.manager]: 0xe67e22,
  [GRADE_NAMES.owner]: 0xe74c3c,
});

// ─── Repositionner le rôle bot ────────────────────────────────────────────────

async function repositionBotRole(guild, ownerRoleId) {
  try {
    const ownerRole = ownerRoleId && guild.roles.cache.get(ownerRoleId);
    const botMember = guild.members.me;
    const botRole = botMember?.roles?.botRole;
    if (ownerRole && botRole && botRole.position <= ownerRole.position) {
      await guild.roles.setPositions([
        { role: botRole.id, position: ownerRole.position + 1 }
      ]).catch((err) => logger.warn(`[setup] Failed to reposition bot role: ${err?.message}`));
    }
  } catch (err) {
    logger.warn(`[setup] Failed to reposition bot role: ${err?.message}`);
  }
}

// ─── Créer tous les rôles en une passe ───────────────────────────────────────

async function createRolesAutoHelper(interaction, guild, guildId, renderStepFn) {
  for (const grade of ORDERED_GRADES) {
    try {
      const existingMappedId = getGradeMappings(guildId)[grade];
      const alreadyExists = existingMappedId && guild.roles.cache.has(existingMappedId);
      if (alreadyExists) continue;
      const role = await guild.roles.create({
        name: gradeLabel(grade),
        color: ROLE_COLORS[grade] ?? 0x99aab5,
        reason: 'Guardian setup — création automatique des rôles',
      });
      setGradeRole(guildId, grade, role.id);
    } catch (err) {
      logger.error(`Failed to create role for grade ${grade}`, err);
    }
  }
  setGuildSetting(guildId, 'setup', 'roles_auto_created', true);
  setGuildSetting(guildId, 'setup', 'fresh_install', false);
  setGradeCursor(guildId, 0);
  await repositionBotRole(guild, getGradeMappings(guildId)[GRADE_NAMES.owner]);
  await renderStepFn(interaction, 1);
}

// ─── Détection doublons rôles ─────────────────────────────────────────────────

function detectDuplicateGradeRoles(guild) {
  if (!guild?.roles?.cache) return [];
  const dupes = [];
  for (const grade of ORDERED_GRADES) {
    const label = gradeLabel(grade).toLowerCase();
    const matches = [...guild.roles.cache.values()].filter(
      (r) => r.name.toLowerCase() === label && !r.managed && r.id !== guild.roles.everyone?.id
    );
    if (matches.length > 1) dupes.push({ grade, roles: matches });
  }
  return dupes;
}

// ─── autoPositionChannelCursor ────────────────────────────────────────────────

function autoPositionChannelCursor(guildId, guild) {
  const _steps = require('./setupSteps');
  const { CHANNEL_SLOTS } = _steps;
  const isCommunityGuild = _steps.isCommunityGuild;
  const slots = _steps.getActiveSlotsForInstall(guildId, guild, CHANNEL_SLOTS, isCommunityGuild);
  const ignored = _steps.getIgnoredChannelSlots(guildId);
  const firstUnconfigured = slots.findIndex(
    (s) => !ignored.includes(s.key) && !getGuildSetting(guildId, s.settingSection, s.settingKey, null)
  );
  if (firstUnconfigured !== -1) _steps.setChannelCursor(guildId, firstUnconfigured);
}

module.exports = {
  GRADE_LABELS,
  ROLE_COLORS,
  gradeLabel,
  getGradeCursor,
  setGradeCursor,
  getCurrentStep,
  boolText,
  onOff,
  onOffDot,
  buildNavRow,
  buildRoleOptions,
  hasMapableRoles,
  getRolesAutoCreated,
  getGradeRenameMap,
  setGradeRenameName,
  isFreshInstall,
  repositionBotRole,
  createRolesAutoHelper,
  detectDuplicateGradeRoles,
  autoPositionChannelCursor,
};
