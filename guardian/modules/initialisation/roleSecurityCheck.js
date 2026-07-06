const { PermissionFlagsBits } = require('discord.js');

const DANGEROUS_PERMISSIONS = [
  { flag: PermissionFlagsBits.Administrator,        label: 'Administrateur',                  severity: 'critical' },
  { flag: PermissionFlagsBits.ManageGuild,          label: 'Gérer le serveur',                severity: 'high'     },
  { flag: PermissionFlagsBits.ManageRoles,          label: 'Gérer les rôles',                 severity: 'high'     },
  { flag: PermissionFlagsBits.ManageChannels,       label: 'Gérer les salons',                severity: 'high'     },
  { flag: PermissionFlagsBits.BanMembers,           label: 'Bannir des membres',              severity: 'medium'   },
  { flag: PermissionFlagsBits.KickMembers,          label: 'Expulser des membres',            severity: 'medium'   },
  { flag: PermissionFlagsBits.ManageWebhooks,       label: 'Gérer les webhooks',              severity: 'medium'   },
  { flag: PermissionFlagsBits.ManageNicknames,      label: 'Gérer les pseudos',               severity: 'low'      },
  { flag: PermissionFlagsBits.MentionEveryone,      label: 'Mentionner @everyone',            severity: 'medium'   },
  { flag: PermissionFlagsBits.ModerateMembers,      label: 'Mettre en sourdine (timeout)',    severity: 'medium'   },
  { flag: PermissionFlagsBits.ManageMessages,       label: 'Gérer les messages',              severity: 'low'      },
  { flag: PermissionFlagsBits.ViewAuditLog,         label: 'Voir les logs d\'audit',          severity: 'low'      },
];

const SEVERITY_ICONS = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' };

/**
 * Analyse les rôles d'une guild qui ne sont pas des rôles Guardian mappés.
 * Retourne les rôles dangereux et les rôles inutilisés.
 *
 * @param {import('discord.js').Guild} guild
 * @param {string[]} guardianRoleIds - IDs des rôles déjà mappés à Guardian
 * @returns {{ dangerous: RoleIssue[], unused: RoleInfo[] }}
 */
function analyzeNonGuardianRoles(guild, guardianRoleIds = []) {
  const guardianSet = new Set(guardianRoleIds);
  const dangerous = [];
  const unused = [];

  for (const [, role] of guild.roles.cache) {
    if (role.managed) continue;
    if (role.id === guild.roles.everyone.id) continue;
    if (guardianSet.has(role.id)) continue;

    const dangerousPerms = DANGEROUS_PERMISSIONS.filter(
      ({ flag }) => role.permissions.has(flag)
    );

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
 * Builds the content string for the security check step.
 */
function buildSecurityCheckContent(dangerous, unused) {
  if (dangerous.length === 0 && unused.length === 0) return null;

  const lines = [
    '## 🔐 Audit de sécurité des rôles',
    '',
    'Guardian a détecté des rôles existants qui méritent ton attention avant de continuer.',
    ''
  ];

  if (dangerous.length > 0) {
    lines.push('### ⚠️ Rôles avec permissions sensibles');
    lines.push('> Ces rôles ont des permissions qui peuvent représenter un risque de sécurité.');
    lines.push('');
    for (const r of dangerous.slice(0, 10)) {
      const icon = SEVERITY_ICONS[r.highestSeverity];
      const perms = r.permissions.map(p => `\`${p.label}\``).join(', ');
      const members = r.memberCount > 0 ? ` — ${r.memberCount} membre(s)` : ' — aucun membre';
      lines.push(`> ${icon} **@${r.name}**${members}`);
      lines.push(`> ↳ ${perms}`);
    }
    lines.push('');
  }

  if (unused.length > 0) {
    lines.push('### 🗑️ Rôles inutilisés (0 membres)');
    lines.push('> Ces rôles n\'ont aucun membre. Tu peux les supprimer ou les conserver.');
    lines.push('');
    for (const r of unused.slice(0, 10)) {
      lines.push(`> ⚪ **@${r.name}**`);
    }
    lines.push('');
  }

  lines.push('> Clique sur un rôle pour agir dessus, ou **Continuer** pour ignorer.');

  return lines.join('\n');
}

module.exports = { analyzeNonGuardianRoles, buildSecurityCheckContent, SEVERITY_ICONS };
