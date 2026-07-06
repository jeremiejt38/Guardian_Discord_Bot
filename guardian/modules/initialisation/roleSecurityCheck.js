const { PermissionFlagsBits } = require('discord.js');

const DANGEROUS_PERMISSIONS = [
  { flag: PermissionFlagsBits.Administrator,   key: 'permAdministrator', severity: 'critical' },
  { flag: PermissionFlagsBits.ManageGuild,     key: 'permManageGuild',   severity: 'high'     },
  { flag: PermissionFlagsBits.ManageRoles,     key: 'permManageRoles',   severity: 'high'     },
  { flag: PermissionFlagsBits.ManageChannels,  key: 'permManageChannels',severity: 'high'     },
  { flag: PermissionFlagsBits.BanMembers,      key: 'permBanMembers',    severity: 'medium'   },
  { flag: PermissionFlagsBits.KickMembers,     key: 'permKickMembers',   severity: 'medium'   },
  { flag: PermissionFlagsBits.ManageWebhooks,  key: 'permManageWebhooks',severity: 'medium'   },
  { flag: PermissionFlagsBits.ManageNicknames, key: 'permManageNicknames',severity: 'low'     },
  { flag: PermissionFlagsBits.MentionEveryone, key: 'permMentionEveryone',severity: 'medium'  },
  { flag: PermissionFlagsBits.ModerateMembers, key: 'permModerateMembers',severity: 'medium'  },
  { flag: PermissionFlagsBits.ManageMessages,  key: 'permManageMessages', severity: 'low'     },
  { flag: PermissionFlagsBits.ViewAuditLog,    key: 'permViewAuditLog',   severity: 'low'     },
];

const SEVERITY_ICONS = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };

/**
 * Analyse les rôles d'une guild qui ne sont pas des rôles Guardian mappés.
 * @param {import('discord.js').Guild} guild
 * @param {string[]} guardianRoleIds
 * @returns {{ dangerous: object[], unused: object[] }}
 */
function analyzeNonGuardianRoles(guild, guardianRoleIds = []) {
  const guardianSet = new Set(guardianRoleIds);
  const dangerous = [];
  const unused = [];

  for (const [, role] of guild.roles.cache) {
    if (role.managed) continue;
    if (role.id === guild.roles.everyone.id) continue;
    if (guardianSet.has(role.id)) continue;

    const dangerousPerms = DANGEROUS_PERMISSIONS.filter(({ flag }) => role.permissions.has(flag));

    if (dangerousPerms.length > 0) {
      dangerous.push({
        id: role.id,
        name: role.name,
        memberCount: role.members?.size ?? 0,
        permissions: dangerousPerms,
        highestSeverity: dangerousPerms.some(p => p.severity === 'critical') ? 'critical'
          : dangerousPerms.some(p => p.severity === 'high') ? 'high'
          : dangerousPerms.some(p => p.severity === 'medium') ? 'medium' : 'low'
      });
    } else if ((role.members?.size ?? 0) === 0) {
      unused.push({ id: role.id, name: role.name });
    }
  }

  dangerous.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.highestSeverity] - order[b.highestSeverity];
  });

  return { dangerous, unused };
}

/**
 * @param {object[]} dangerous
 * @param {object[]} unused
 * @param {function} _
 * @param {Set<string>} resolvedIds - IDs des rôles dont le problème a été traité
 */
function buildSecurityCheckContent(dangerous, unused, _, resolvedIds = new Set()) {
  if (dangerous.length === 0 && unused.length === 0) return null;

  const allResolved = [...dangerous, ...unused].every(r => resolvedIds.has(r.id));
  const lines = [_('roleSecurity.title'), '', allResolved ? _('roleSecurity.introResolved') : _('roleSecurity.intro'), ''];

  if (dangerous.length > 0) {
    lines.push(_('roleSecurity.dangerousTitle'));
    lines.push(_('roleSecurity.dangerousIntro'));
    lines.push('');
    for (const r of dangerous.slice(0, 10)) {
      const resolved = resolvedIds.has(r.id);
      const icon = resolved ? '🟢' : SEVERITY_ICONS[r.highestSeverity];
      const perms = r.permissions.map(p => `\`${_(p.key ? `roleSecurity.${p.key}` : 'roleSecurity.permAdministrator')}\``).join(', ');
      const membersLabel = r.memberCount > 0
        ? ` — ${_('roleSecurity.members', { count: r.memberCount })}`
        : ` — ${_('roleSecurity.noMembers')}`;
      lines.push(`> ${icon} **@${r.name}**${membersLabel}`);
      if (!resolved) lines.push(`> ↳ ${perms}`);
    }
    lines.push('');
  }

  if (unused.length > 0) {
    lines.push(_('roleSecurity.unusedTitle'));
    lines.push(_('roleSecurity.unusedIntro'));
    lines.push('');
    for (const r of unused.slice(0, 10)) {
      const icon = resolvedIds.has(r.id) ? '🟢' : '🔴';
      lines.push(`> ${icon} **@${r.name}**`);
    }
    lines.push('');
  }

  lines.push(allResolved ? _('roleSecurity.footerResolved') : _('roleSecurity.footer'));
  return lines.join('\n');
}

function hasUnresolvedIssues(dangerous, unused, resolvedIds = new Set()) {
  return [...dangerous, ...unused].some(r => !resolvedIds.has(r.id));
}

module.exports = { analyzeNonGuardianRoles, buildSecurityCheckContent, hasUnresolvedIssues, SEVERITY_ICONS };
