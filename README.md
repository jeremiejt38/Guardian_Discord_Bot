<div align="center">

# 🛡️ Guardian

**All-in-one Discord community bot for gaming servers**

[![Version](https://img.shields.io/badge/version-v0.21.3-blue?style=flat-square)](https://github.com/jeremiejt38/Guardian_Discord_Bot/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen?style=flat-square)](#tests)

*Member management, games, temporary voice channels, moderation and configuration — all from an interactive Discord wizard.*

</div>

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 🧙 **Setup wizard** | Guided 8-step configuration directly inside Discord |
| 👥 **Members** | Invite → Member onboarding, sponsorship, behavior score |
| 🎮 **Games** | Per-game opt-in, dedicated channels (chat / gallery / updates), Steam & RAWG.io integration |
| 🔊 **Temporary voice** | On-demand creation, auto-deletion, prefix/suffix/limit |
| 🛡️ **Moderation** | Anti-spam, blacklist, logs, behavior score, auto-expulsion |
| 🖥️ **Game servers** | Proposal, approval and tracking of community game servers |
| ⚙️ **Config panels** | Persistent admin panels per module (channels, roles, games…) |
| 🔔 **DM notifications** | Per-category private alerts (bot updates, errors, moderation, promotions…) |
| 🔄 **Migrations** | Versioned DB & Discord migrations — zero data loss on upgrades |
| 🌐 **i18n** | French, English, Spanish, Portuguese, Italian, German support |

---

## 🚀 Getting started

### Step 0 — Prerequisites

#### Node.js ≥ 18

| OS | Command |
|----|---------|
| **Windows** | Download the installer from [nodejs.org](https://nodejs.org) |
| **macOS** | `brew install node` *(via [Homebrew](https://brew.sh))* |
| **Linux** | `sudo apt install nodejs npm` *(Debian/Ubuntu)* or `sudo dnf install nodejs` *(Fedora)* |

Verify: `node -v` should display `v18.x` or higher.

#### PM2 — Process manager *(recommended for production)*

PM2 keeps the bot running 24/7 and enables **automatic updates** from Discord (no manual restart needed).

| OS | Command |
|----|---------|
| **Windows** | `npm install -g pm2` *(run as administrator)* |
| **macOS** | `npm install -g pm2` |
| **Linux** | `npm install -g pm2` |

> Without PM2, the bot works normally but you will need to restart it manually after an update.

#### Discord Developer account

- Create an application on the [Discord Developer Portal](https://discord.com/developers/applications)
- Retrieve the bot **Token** and **Application ID**
- Enable intents: `Server Members Intent`, `Message Content Intent`

---

### Step 1 — Installation

The following commands are identical on Windows, macOS and Linux:

```bash
# Clone the repository
git clone https://github.com/jeremiejt38/Guardian_Discord_Bot.git
cd Guardian_Discord_Bot/guardian

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# → Edit .env with your text editor (see Variables section below)

# Deploy Discord slash commands
npm run deploy:commands
```

---

### Step 2 — Run the bot

#### With PM2 *(recommended)*

```bash
pm2 start index.js --name guardian   # Start the bot in the background
pm2 save                              # Save for automatic restart on crash
pm2 startup                           # Start PM2 on machine boot (Linux/macOS)
```

Useful commands:
```bash
pm2 logs guardian      # View live logs
pm2 restart guardian   # Restart the bot
pm2 stop guardian      # Stop the bot
pm2 status             # View all process statuses
```

#### Without PM2 *(development/testing)*

```bash
npm start
```

---

### Environment variables (`.env`)

#### Required

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Bot token (Developer Portal → Bot → Token) |
| `CLIENT_ID` | Application ID (Developer Portal → General Information) |
| `NODE_ENV` | `production` or `development` |

#### Optional

| Variable | Description |
|----------|-------------|
| `BOT_ADMIN_ID` | Discord ID of the bot system administrator — receives alerts and can trigger updates from Discord. If empty, the bot will automatically ask the first user who added it. |
| `RAWG_API_KEY` | [RAWG.io](https://rawg.io/apidocs) API key — enriches game profiles (description, genres, platforms). Works without it. |
| `DATABASE_PATH` | Path to the SQLite database. Default: `./data/guardian.db` |
| `DISCORD_TOKEN_PRODUCTION` | Alternate token for the production environment |
| `DISCORD_TOKEN_DEVELOPMENT` | Alternate token for the development environment |
| `DISCORD_TOKEN_TEST` | Alternate token for automated tests |

---

### Core libraries

| Library | Role |
|---------|------|
| [discord.js](https://discord.js.org) v14 | Full Discord API interaction (events, slash commands, buttons, modals…) |
| `node:sqlite` *(built-in Node 22+)* | Embedded SQLite database — no external dependency |
| `dotenv` | Environment variable loading from `.env` |
| `node:child_process` *(built-in)* | Runs `git pull` + `npm install` for automatic updates |
| `node:os` / `node:fs` *(built-in)* | System info (RAM, uptime, DB size) for the admin panel |

> Guardian uses **no heavy dependencies**: no Express, no ORM, no Redis. The only external requirement is discord.js.

---

## 🗂️ Project structure

```
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
│   │   ├── initialisation/# Setup wizard, channel/role creation, seeds
│   │   ├── members/       # Promotions, sponsorship, behavior score
│   │   ├── migrations/    # Versioned Discord migrations (channels, roles)
│   │   ├── moderation/    # Anti-spam, blacklist, moderation logs
│   │   ├── notifications/ # Per-guild configurable DM notifications
│   │   ├── servers/       # Game server monitor
│   │   └── utils/         # Shared utilities (discordErrors, channels…)
│   └── tests/             # Unit test suite
└── .lando.yml             # Isolated test environment (Docker)
```

---

## 🧪 Tests

```bash
cd guardian
npm test
```

Tests run on an in-memory SQLite database and cover the setup wizard, config panels, games and moderation.
**E2E tests** (`tests/e2e.test.js`) cover 6 complete integration flows: setup, games, members, moderation, migrations, notifications.

---

## Changelog

### v0.21.x — Admin Panel DM ← *current*
| Version | Date | Content |
|---------|------|---------|
| **v0.21.3** | 2026-07-08 | Fix: post-update message without PM2 — precise restart instructions + PM2 tip ← *current* |
| v0.21.2 | 2026-07-08 | Docs: README rewritten in English — PM2 multi-OS setup, .env variables, core libraries |
| v0.21.1 | 2026-07-08 | Fix: Admin Panel — 🔄 button becomes ✖ Close when a view is open, cancels timeout |
| v0.21.0 | 2026-07-08 | Feat: system admin DM panel — 4 views (Status/Servers/DB/Notifs), alert toggles, 15min timeout, auto-bootstrap, `/admin`, guild join/leave alerts |

### v0.20.x — Auto-update & Bot admin
| Version | Date | Content |
|---------|------|---------|
| **v0.20.0** | 2026-07-07 | Feat: `BOT_ADMIN_ID` in `.env` — automatic update via DM button (`git pull` + `npm install` + PM2 restart) |

### v0.19.x and earlier

> Full history available at [github.com/jeremiejt38/Guardian_Discord_Bot/releases](https://github.com/jeremiejt38/Guardian_Discord_Bot/releases)

---

## ✅ Roadmap v1.0.0

Delivered items validated before the public v1.0.0 release:

### 🔴 Blocking
- [x] **End-to-end integration tests** — 8 E2E tests, 6 complete flows, 95 tests total ✅ v0.10.5
- [x] **Discord 50013 error handling** — `safeDiscordAction` + global interactionCreate safety net ✅ v0.10.3
- [x] **Automatic DB migration** — versioned `MIGRATIONS` array system ✅ v0.10.1
- [x] **`/help` command** — contextual help for 7 modules, embeds, i18n ✅ v0.10.4

### 🟠 Important
- [x] **Multi-language** — ES, PT, IT + DE (FR+EN already present) ✅ v0.19.5
- [x] **Post-install summary** — dynamic `#welcome` message with roles, games, modules, next steps ✅ v0.19.7
- [x] **Game list pagination** — 3 games per page, unlimited ✅ v0.10.2
- [x] **Step 3 validation** — `#general` required before proceeding ✅ v0.10.2
- [x] **Rate limiting** — 4-level debounce 600ms→5s, `rateLimit.js`, auto-cleanup ✅ v0.11.1
- [x] **Bot system admin panel** — DM panel, alert toggles, auto-update, bootstrap ✅ v0.21.0

### 🟡 Nice-to-have
- [ ] **Web dashboard** — lightweight interface to view stats without opening Discord
- [ ] **Steam notifications** — direct webhook from Steam API instead of polling
- [ ] **Config export** — save/restore a server configuration as JSON
- [ ] **`/setup resume`** — resume the wizard from anywhere via slash command
- [ ] **Discord forum support** — use Forum Channels for suggestions and reports

---

## 🚀 Post-v1.0.0 Roadmap

### v1.1 — UX & Commands
| Feature | Description |
|---------|-------------|
| `/setup resume` | Resume wizard from anywhere via slash command |
| Web dashboard | Lightweight stats and log viewer without opening Discord |

### v1.2 — Extended i18n
| Feature | Description |
|---------|-------------|
| More languages | NL, PL, RU, ZH, JA, KO — structure ready, JSON files to create |

### v1.3 — Advanced moderation
| Feature | Description |
|---------|-------------|
| Temporary sanctions | Mute/ban with automatic expiration |
| `/warn` with thresholds | Auto-escalation (warn → mute → kick → ban) |
| Log export | Export moderation logs as CSV |
| Anti-raid | Mass join detection and temporary lockdown |

### v1.4 — Games & Community
| Feature | Description |
|---------|-------------|
| Steam notifications | Direct Steam API webhook instead of polling |
| Forum Channels support | Forum Channels for suggestions and reports |
| Behavior leaderboard | Member ranking by behavior score |

### v1.5 — Admin & Infrastructure
| Feature | Description |
|---------|-------------|
| Config export/import | Save/restore a complete server configuration as JSON |
| Web dashboard | Lightweight interface to view stats and logs without Discord |
| Internal REST API | Endpoints for third-party integrations (incoming webhooks, stats) |

---

## 🤝 Contributing

Issues and pull requests are welcome. Please follow the [Conventional Commits](https://www.conventionalcommits.org/) convention.

---

<div align="center">
  <sub>Made with ❤️ for Discord gaming communities</sub>
</div>
