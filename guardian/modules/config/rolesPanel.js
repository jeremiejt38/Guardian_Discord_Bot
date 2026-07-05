const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { CHANNELS, GRADE_NAMES } = require('../../config');
const { t } = require('../i18n');
const { replyEphemeral } = require('../utils/interactions');
const { findTextChannelByName } = require('../utils/channels');
const { getGradeMappings } = require('../initialisation/gradeMapping');
const { logConfigChange } = require('./configLogger');

const GRADES_LIST = [
  GRADE_NAMES.invite,
  GRADE_NAMES.membre,
  GRADE_NAMES.moderateur,
  GRADE_NAMES.manager,
  GRADE_NAMES.owner
];

const IDS = Object.freeze({
  editPrefix: 'roles:edit:',
  modalPrefix: 'roles:modal:'
});

function hasOwnerGrade(member, guildId) {
  const mappings = getGradeMappings(guildId);
  const ownerRoleId = mappings[GRADE_NAMES.owner];
  return ownerRoleId && member.roles.cache.has(ownerRoleId);
}

function buildPanelContent(guild, guildId) {
  const mappings = getGradeMappings(guildId);
  const lines = [`**${t(guildId, 'config.roles.title')}**\n`];
  for (const grade of GRADES_LIST) {
    const roleId = mappings[grade];
    const role = roleId ? guild.roles.cache.get(roleId) : null;
    lines.push(`• **${grade}** : ${role ? `<@&${role.id}> (\`${role.name}\`)` : '❌ non configuré'}`);
  }
  lines.push(`\n${t(guildId, 'config.roles.hint')}`);
  return lines.join('\n');
}

function buildRows(guildId) {
  const buttons = GRADES_LIST.map((grade) =>
    new ButtonBuilder()
      .setCustomId(`${IDS.editPrefix}${grade}`)
      .setLabel(t(guildId, 'config.roles.editButton', { grade }))
      .setStyle(ButtonStyle.Primary)
  );
  const rows = [];
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 4)));
  }
  return rows;
}

async function seedRolesPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.roles);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const hasPanel = msgs?.some((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (hasPanel) return;
  const guildId = guild.id;
  await channel.send({ content: buildPanelContent(guild, guildId), components: buildRows(guildId) }).catch(() => undefined);
}

async function refreshRolesPanel(guild) {
  const channel = findTextChannelByName(guild, CHANNELS.roles);
  if (!channel) return;
  const msgs = await channel.messages.fetch({ limit: 5 }).catch(() => null);
  const panel = msgs?.find((m) => m.author.id === guild.client.user.id && m.components.length > 0);
  if (!panel) return;
  const guildId = guild.id;
  await panel.edit({ content: buildPanelContent(guild, guildId), components: buildRows(guildId) }).catch(() => undefined);
}

async function handleRolesInteraction(interaction) {
  const { customId, guildId } = interaction;
  if (!customId?.startsWith('roles:')) return false;

  if (!hasOwnerGrade(interaction.member, guildId)) {
    await replyEphemeral(interaction, t(guildId, 'config.ownerOnly'));
    return true;
  }

  if (interaction.isButton() && customId.startsWith(IDS.editPrefix)) {
    const grade = customId.slice(IDS.editPrefix.length);
    const modal = new ModalBuilder()
      .setCustomId(`${IDS.modalPrefix}${grade}`)
      .setTitle(t(guildId, 'config.roles.modalTitle', { grade }))
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name')
            .setLabel(t(guildId, 'config.roles.nameLabel'))
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(32)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('color')
            .setLabel(t(guildId, 'config.roles.colorLabel'))
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#FF5733')
            .setRequired(false)
            .setMaxLength(7)
        )
      );
    await interaction.showModal(modal);
    return true;
  }

  if (interaction.isModalSubmit() && customId.startsWith(IDS.modalPrefix)) {
    const grade = customId.slice(IDS.modalPrefix.length);
    const name = interaction.fields.getTextInputValue('name').trim();
    const color = interaction.fields.getTextInputValue('color').trim();

    const mappings = getGradeMappings(guildId);
    const roleId = mappings[grade];
    if (!roleId) {
      await replyEphemeral(interaction, t(guildId, 'config.roles.notMapped', { grade }));
      return true;
    }

    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      await replyEphemeral(interaction, t(guildId, 'config.roles.roleNotFound'));
      return true;
    }

    const updates = {};
    if (name) updates.name = name;
    if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) updates.color = color;

    if (Object.keys(updates).length === 0) {
      await replyEphemeral(interaction, t(guildId, 'config.roles.nothingChanged'));
      return true;
    }

    await role.edit(updates).catch(() => undefined);
    await logConfigChange(interaction.guild, interaction.user.id, `role.${grade}`, {}, updates);
    await refreshRolesPanel(interaction.guild);
    await replyEphemeral(interaction, t(guildId, 'config.roles.updated', { grade }));
    return true;
  }

  return false;
}

module.exports = { seedRolesPanel, handleRolesInteraction };
