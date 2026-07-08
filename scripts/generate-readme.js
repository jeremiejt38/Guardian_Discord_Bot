#!/usr/bin/env node
/**
 * README generator — rebuilds README.md from scripts/readme-data.js
 *
 * Usage:
 *   node scripts/generate-readme.js          # generate + commit + push
 *   node scripts/generate-readme.js --dry    # generate only, no git
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const data = require('./readme-data.js');
const README_PATH = path.resolve(__dirname, '../README.md');
const PKG_PATH = path.resolve(__dirname, '../guardian/package.json');
const GITHUB_BASE = data.GITHUB_BASE;

const dry = process.argv.includes('--dry');

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: dry ? 'pipe' : 'inherit' }).trim();
}

// ── Section builders ─────────────────────────────────────────────────────────

function version() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  return pkg.version;
}

function badgeVersion(v) {
  return `[![Version](https://img.shields.io/badge/version-v${v}-blue?style=flat-square)](${GITHUB_BASE}/releases)`;
}

function table(headers, rows, align) {
  const cols = headers.length;
  const sep = headers.map((_, i) => (align?.[i] === 'left' ? ':---' : '---'));
  const fmt = (row) => `| ${row.join(' | ')} |`;
  return [fmt(headers), fmt(sep), ...rows.map(fmt)].join('\n');
}

function featuresSection() {
  const rows = data.FEATURES.map((f) => [`${f.emoji} **${f.module}**`, f.desc]);
  return `## ✨ Features\n\n${table(['Module', 'Description'], rows)}\n`;
}

function gettingStartedSection() {
  return `## 🚀 Getting started

### Step 0 — Prerequisites

#### Node.js ≥ 18

| OS | Command |
|----|---------|
| **Windows** | Download the installer from [nodejs.org](https://nodejs.org) |
| **macOS** | \`brew install node\` *(via [Homebrew](https://brew.sh))* |
| **Linux** | \`sudo apt install nodejs npm\` *(Debian/Ubuntu)* or \`sudo dnf install nodejs\` *(Fedora)* |

Verify: \`node -v\` should display \`v18.x\` or higher.

#### PM2 — Process manager *(recommended for production)*

PM2 keeps the bot running 24/7 and enables **automatic updates** from Discord (no manual restart needed).

| OS | Command |
|----|---------|
| **Windows** | \`npm install -g pm2\` *(run as administrator)* |
| **macOS** | \`npm install -g pm2\` |
| **Linux** | \`npm install -g pm2\` |

> Without PM2, the bot works normally but you will need to restart it manually after an update.

#### Discord Developer account

- Create an application on the [Discord Developer Portal](https://discord.com/developers/applications)
- Retrieve the bot **Token** and **Application ID**
- Enable intents: \`Server Members Intent\`, \`Message Content Intent\`

---

### Step 1 — Installation

The following commands are identical on Windows, macOS and Linux:

\`\`\`bash
# Clone the repository
git clone https://github.com/${data.GITHUB_REPO}.git
cd Guardian_Discord_Bot/guardian

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# → Edit .env with your text editor (see Variables section below)

# Deploy Discord slash commands
npm run deploy:commands
\`\`\`

---

### Step 2 — Run the bot

#### With PM2 *(recommended)*

\`\`\`bash
pm2 start index.js --name guardian   # Start the bot in the background
pm2 save                              # Save for automatic restart on crash
pm2 startup                           # Start PM2 on machine boot (Linux/macOS)
\`\`\`

Useful commands:
\`\`\`bash
pm2 logs guardian      # View live logs
pm2 restart guardian   # Restart the bot
pm2 stop guardian      # Stop the bot
pm2 status             # View all process statuses
\`\`\`

#### Without PM2 *(development/testing)*

\`\`\`bash
npm start
\`\`\`

---

### Environment variables (\`.env\`)

#### Required

${table(['Variable', 'Description'], data.ENV_REQUIRED.map((e) => [`\`${e.variable}\``, e.desc]))}

#### Optional

${table(['Variable', 'Description'], data.ENV_OPTIONAL.map((e) => [`\`${e.variable}\``, e.desc]))}

---

### Core libraries

${table(['Library', 'Role'], data.LIBRARIES.map((l) => [l.lib, l.role]))}

> Guardian uses **no heavy dependencies**: no Express, no ORM, no Redis. The only external requirement is discord.js.
`;
}

function projectStructureSection() {
  return `## 🗂️ Project structure

\`\`\`
Guardian_Discord_Bot/
├── guardian/
│   ├── commands/          # Slash commands (/ban, /config-games, /admin…)
│   ├── database/          # SQLite schema + migrations
│   ├── events/            # Discord event handlers (ready, guildCreate, interactionCreate…)
│   ├── locales/           # Translation files (fr.json, en.json, es.json…)
│   ├── modules/
│   │   ├── admin/         # Bot system admin panel, alerts, auto-update
│   │   ├── config/        # Admin configuration panels
│   │   ├── games/         # Game management, opt-in, Steam/RAWG changelogs
│   │   ├── guides/        # Auto-generated server guide channels
│   │   ├── initialisation/# Setup wizard, channel/role creation, seeds
│   │   ├── members/       # Promotions, sponsorship, behavior score, rules acceptance
│   │   ├── migrations/    # Versioned Discord migrations (channels, roles, new options)
│   │   ├── moderation/    # Anti-spam, blacklist, moderation logs, AutoMod integration
│   │   ├── notifications/ # Per-guild configurable DM notifications
│   │   ├── servers/       # Game server monitor
│   │   └── utils/         # Shared utilities (discordErrors, channels…)
│   └── tests/             # Unit + E2E test suite
├── scripts/               # Release, README generation, roadmap management
└── .windsurf/workflows/   # Developer workflow shortcuts
\`\`\`
`;
}

function testsSection() {
  return `## 🧪 Tests

\`\`\`bash
${data.TESTS.command}
\`\`\`

${data.TESTS.description}
**${data.TESTS.e2e}**
`;
}

function changelogSection() {
  const rows = [];
  for (const entry of data.CHANGELOG) {
    const linksStr = entry.links.map((l) => {
      if (typeof l === 'string') {
        return `[${l}](${GITHUB_BASE}/commit/${l})`;
      }
      return `[${l.label}](${l.url})`;
    }).join(' ');
    rows.push(`| **${entry.version}** | **${entry.title}** — ${entry.desc} |`);
    rows.push(`| | ${linksStr} |`);
  }
  return `## Changelog\n\n| Version | Description |\n|---------|-------------|\n${rows.join('\n')}\n`;
}

function roadmapItem(item) {
  const check = item.done ? '[x]' : '[ ]';
  const suffix = item.done && item.doneVersion ? ` ✅ ${item.doneVersion}` : (item.done ? ' ✅' : '');
  return `- ${check} **${item.label}** — ${item.desc}${suffix}`;
}

function roadmapV1Section() {
  const { blocking, important, nice } = data.ROADMAP_V1;
  return `## ✅ Roadmap v1.0.0

Delivered items validated before the public v1.0.0 release:

### 🔴 Blocking
${blocking.map(roadmapItem).join('\n')}

### 🟠 Important
${important.map(roadmapItem).join('\n')}

### 🟡 Nice-to-have (pre-V1)
${nice.map(roadmapItem).join('\n')}
`;
}

function roadmapPostV1Section() {
  const sections = data.ROADMAP_POST_V1.map((s) => {
    const noteStr = s.note ? `> ${s.note}\n\n` : '';
    const rows = s.features.map((f) => {
      const labelStr = f.done ? `~~${f.label}~~ ✅` : f.label;
      return `| ${labelStr} | ${f.desc} |`;
    });
    return `### ${s.version} — ${s.title}\n${noteStr}| Feature | Description |\n|---------|-------------|\n${rows.join('\n')}`;
  });
  return `## 🚀 Post-v1.0.0 Roadmap\n\n${sections.join('\n\n')}\n`;
}

// ── Main generator ────────────────────────────────────────────────────────────

function generate() {
  const v = version();

  const sections = [
    `<div align="center">\n\n# 🛡️ Guardian\n\n**All-in-one Discord community bot for gaming servers**\n\n${badgeVersion(v)}\n[![Node](https://img.shields.io/badge/node-%3E%3D18-green?style=flat-square)](https://nodejs.org)\n[![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](LICENSE)\n[![Tests](https://img.shields.io/badge/tests-passing-brightgreen?style=flat-square)](#tests)\n\n*${data.TAGLINE}*\n\n</div>`,
    '---',
    featuresSection(),
    '---',
    gettingStartedSection(),
    '---',
    projectStructureSection(),
    '---',
    testsSection(),
    '---',
    changelogSection(),
    '---',
    roadmapV1Section(),
    '---',
    roadmapPostV1Section(),
    '---',
    `## 🤝 Contributing\n\nIssues and pull requests are welcome. Please follow the [Conventional Commits](https://www.conventionalcommits.org/) convention.`,
    '---',
    `<div align="center">\n  <sub>Made with ❤️ for Discord gaming communities</sub>\n</div>`,
  ];

  return sections.join('\n\n') + '\n';
}

// ── Entry point ───────────────────────────────────────────────────────────────

const content = generate();
fs.writeFileSync(README_PATH, content, 'utf8');
console.log(`✅ README.md generated (${content.split('\n').length} lines)`);

if (!dry) {
  try {
    const dirty = execSync('git status --porcelain README.md', { encoding: 'utf8' }).trim();
    if (!dirty) {
      console.log('ℹ️  README.md unchanged — nothing to commit.');
      process.exit(0);
    }
    run('git add README.md');
    run('git commit -m "docs: regenerate README.md"');
    run('git push origin main');
    console.log('✅ Committed and pushed.');
  } catch (err) {
    console.error('❌ Git error:', err.message);
    process.exit(1);
  }
}
