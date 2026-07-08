<div align="center">

# 🛡️ Guardian

**All-in-one Discord community bot for gaming servers**

[![Version](https://img.shields.io/badge/version-v0.24.0-blue?style=flat-square)](https://github.com/jeremiejt38/Guardian_Discord_Bot/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-Proprietary-orange?style=flat-square)](LICENSE)

*Member management, games, temporary voice channels, moderation and configuration — all from an interactive Discord wizard.*

</div>

---

## ✨ Features

| Module | Description |
| --- | --- |
| 🧙 **Setup wizard** | Guided 9-step configuration directly inside Discord |
| 👥 **Members** | Invite → Member onboarding (3 modes: Classic / Strict / Direct), sponsorship, behavior score, rules acceptance |
| 🎮 **Games** | Per-game opt-in (up to 15), dedicated channels (chat / gallery / updates), Steam & RAWG.io integration |
| 🔊 **Temporary voice** | On-demand creation, auto-deletion |
| 🛡️ **Moderation** | Anti-spam, blacklist, slow mode, logs, behavior score, auto-expulsion |
| 🖥️ **Game servers** | Proposal, approval and tracking of community game servers |
| ⚙️ **Config panels** | Persistent admin panels per module (channels, roles, games…) |
| 🔔 **DM notifications** | Per-category private alerts (bot updates, errors, moderation, promotions…) |
| 🔄 **Migrations** | Versioned DB & Discord migrations — zero data loss on upgrades |
| 📚 **Server guides** | Auto-generated read-only guide channels (getting started, promotion, games, commands) |
| 🌐 **i18n** | French, English, Spanish, Portuguese, Italian, German support |
| 🔒 **Discord native settings** | AFK, system notifications, language sync, Community channels, AutoMod, Onboarding |
| 🔒 **Unlimited games** | More than 15 games per server |
| 🔒 **Steam changelogs** | Automatic Steam patch notes in a dedicated channel |
| 🔒 **Custom welcome** | Personalized welcome DM with variables (name, server, delay…) |
| 🔒 **Voice customization** | Custom prefix / suffix / member limit per room |
| 🔒 **Suggestions forum** | Structured suggestion system with statuses |
| 🔒 **Game server list** | Community-approved server listing channel |


---

> 🔒 **Features marked with a lock are part of Guardian Premium** — a hosted version with advanced features.
> Premium is coming soon. [Stay tuned.](#)

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
| --- | --- |
| `DISCORD_TOKEN` | Bot token (Developer Portal → Bot → Token) |
| `CLIENT_ID` | Application ID (Developer Portal → General Information) |
| `NODE_ENV` | `production` or `development` |

#### Optional

| Variable | Description |
| --- | --- |
| `BOT_ADMIN_ID` | Discord ID of the bot system administrator — receives alerts and can trigger updates from Discord. If empty, the bot will automatically ask the first user who added it. |
| `RAWG_API_KEY` | [RAWG.io](https://rawg.io/apidocs) API key — enriches game profiles (description, genres, platforms). Works without it. |
| `DATABASE_PATH` | Path to the SQLite database. Default: `./data/guardian.db` |
| `GITHUB_TOKEN` | GitHub personal access token — used by the release script to create GitHub releases automatically. |

---

### Core libraries

| Library | Role |
| --- | --- |
| [discord.js](https://discord.js.org) v14 | Full Discord API interaction (events, slash commands, buttons, modals…) |
| `node:sqlite` *(built-in Node 22+)* | Embedded SQLite database — no external dependency |
| `dotenv` | Environment variable loading from `.env` |
| `node:child_process` *(built-in)* | Runs `git pull` + `npm install` for automatic updates |
| `node:os` / `node:fs` *(built-in)* | System info (RAM, uptime, DB size) for the admin panel |

> Guardian uses **no heavy dependencies**: no Express, no ORM, no Redis. The only external requirement is discord.js.


---

## Changelog

| Version | Description |
|---------|-------------|
| **v0.24** | **docs+tests**: AXE 4 — ARCHITECTURE.md, 20 tests premium (total 148), fix isPremiumGateClick null-safety, export buildRows · **premium**: AXE 3.4 — Server list gate premium (fix getDb, cadenas UI serveurs+suggestions dans channelsPanel) · **premium**: AXE 3.3 — Forum suggestions avec statuts (threadCreate, UI boutons, gate premium, 10 tests) · **premium**: AXE 3.2 — Welcome DM custom (template {name}/{server}/{delay}/{grade}, gate UI cadenas, 14 tests) · **premium**: AXE 3.1 — sanctions auto comportementales gatées premium (isPremium guard + UI cadenas) · **premium**: AXE 1 — tier system (guild_tier BDD, isPremium, premiumGate, /admin setpremium, 21 tests) |
| | [Full diff](https://github.com/jeremiejt38/Guardian_Discord_Bot/compare/v0.23.16...v0.24.0) |
| **v0.23** | **Community onboarding & premium infrastructure** — 3 invite modes (Classic / Strict / Direct), `#devenir-membre` ephemeral flow, `#rejoindre-notre-serveur`, Discord native settings (AFK, AutoMod, Onboarding), Discord AutoMod→behavior score integration, server guides, premium tier system (`guild_tier`, `isPremium()`, lock buttons 🔒), `/admin setpremium`, premium-gated features (auto sanctions, custom welcome DM, suggestions forum with statuses, server list), release pipeline (free bundle, README generator, changelog grouping by minor, backport), proprietary license + CONTRIBUTING CLA |
| | [Full diff](https://github.com/jeremiejt38/Guardian_Discord_Bot/compare/v0.22.1...v0.23.16) |
| **v0.22** | **Security & Commands** — `/ping` command + 2s cooldown on slash commands, security fix on bootstrap userId from interaction, prerelease confirmation validation against bot cache |
| | [41ab089](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/41ab089) [b6c18ff](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/b6c18ff) |
| **v0.21** | **Admin Panel DM** — Interactive system admin panel in DM, 4 views (Status/Servers/DB/Notifications), per-category alert toggles, 15min inactivity timeout, auto-bootstrap of `BOT_ADMIN_ID`, `/admin` command, guild join/leave alerts, contextual Close button, GitHub release notes fetched and auto-translated (Google Translate unofficial API, fallback to English), precise restart instructions without PM2 |
| | [4d466bc](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/4d466bc) [390af8c](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/390af8c) [c5e7f3b](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/c5e7f3b) [0d4383e](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/0d4383e) [19eb775](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/19eb775) [7bcf9d6](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/7bcf9d6) |
| **v0.20** | **Auto-update & Bot admin** — `BOT_ADMIN_ID` in `.env`, automatic update via DM button (`git pull` + `npm install` + PM2 restart) |
| | [6f5be4a](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/6f5be4a) |
| **v0.19** | **RAWG.io & non-Steam games** — RAWG.io integration, non-Steam pseudo App ID `000XXXXXXX`, DB migration v7, toggle button style fixes, adaptive step 3 navigation, multi-language ES/PT/IT, dynamic post-setup summary |
| | [39fb8e5](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/39fb8e5) [2ff1aa8](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/2ff1aa8) [0f1ab99](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/0f1ab99) [0f16d07](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/0f16d07) [eb8e5bd](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/eb8e5bd) [708c684](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/708c684) |
| **v0.18** | **Non-Steam games** — Pseudo App ID generator, `isNonSteamId()`, duplicate detection fix |
| | [4f1f1e4](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/4f1f1e4) |
| **v0.17** | **Backup & Diagnostics** — Backup message protection, enriched `guardian-logs`, bot panel diagnostics, game server password |
| | [480a873](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/480a873) |
| **v0.16** | **Setup UX & Game Requests** — Improved setup UX, member game requests, channel topics, role colors |
| | [8d6b846](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/8d6b846) |
| **v0.15** | **Auto-update & Prerelease** — Stable auto-update notification, DM prerelease confirmation, `prerelease` field in `package.json` |
| | [c421882](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/c421882) |
| **v0.14 – v0.13 – v0.12** | **Setup UX & Onboarding** — Per-grade role creation, game review step before linking, `#become-member` channel, enriched new member DM, bulk DM at finalize, FAQ as forum channel, channel topics |
| | [2102523](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/2102523) [54d5d9c](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/54d5d9c) [536130f](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/536130f) [0743b5f](https://github.com/jeremiejt38/Guardian_Discord_Bot/commit/0743b5f) |
| **v0.11** | **Resilience, Security & Setup UX** — Auto-detect Guardian channels, smart game channel sorting, role audit, bot role repositioning, Steam top 250 detection, rate limiting debounce, backup/restore via `#guardian-backup` |
| | [Full history on GitHub](https://github.com/jeremiejt38/Guardian_Discord_Bot/releases) |
| **v0.10** | **Robustness & Notifications** — Configurable DM notifications, versioned DB/Discord migrations, Discord error handling, game list pagination, E2E integration tests |
| | [Full history on GitHub](https://github.com/jeremiejt38/Guardian_Discord_Bot/releases) |
| **v0.1 – v0.9** | **Foundations** — Architecture scaffold, SQLite, setup wizard, members, games, voice, moderation, i18n FR+EN |
| | [Full history on GitHub](https://github.com/jeremiejt38/Guardian_Discord_Bot/releases) |



---

## ✅ Roadmap v1.0.0

Delivered items validated before the public v1.0.0 release:

### 🔴 Blocking
- [x] **End-to-end integration tests** — 8 E2E tests, 6 complete flows, 95 tests total ✅ v0.10.5
- [x] **Discord 50013 error handling** — `safeDiscordAction` + global interactionCreate safety net ✅ v0.10.3
- [x] **Automatic DB migration** — Versioned `MIGRATIONS` array system ✅ v0.10.1
- [x] **`/help` command** — Contextual help for 7 modules, embeds, i18n ✅ v0.10.4

### 🟠 Important
- [x] **Multi-language** — ES, PT, IT + DE (FR+EN already present) ✅ v0.19.5
- [x] **Post-install summary** — Dynamic `#welcome` message with roles, games, modules, next steps ✅ v0.19.7
- [x] **Game list pagination** — 3 games per page, unlimited ✅ v0.10.2
- [x] **Step 3 validation** — `#general` required before proceeding ✅ v0.10.2
- [x] **Rate limiting** — 4-level debounce 600ms→5s, `rateLimit.js`, auto-cleanup ✅ v0.11.1
- [x] **Bot system admin panel** — DM panel, alert toggles, auto-update, bootstrap ✅ v0.21.0

### 🟡 Nice-to-have (pre-V1)
- [x] **`/ping`** — Check bot responsiveness and display latency ✅ v0.22.0
- [x] **Slash command cooldown** — Global rate limiting on slash commands ✅ v0.22.0
- [x] **Discord forum support** — Forum Channels for suggestions and reports ✅ v0.23.x
- [ ] **Permission check on startup** — Warn bot admin via DM if `ManageChannels`/`ManageRoles` missing in a guild instead of silently failing
- [ ] **`/status`** — Display current server configuration state (modules, channels, members) without opening wizard. Guild admins only, never bot admin.
- [ ] **Bot admin panel — Recap tab** — 5th tab in admin DM panel showing aggregated anonymous stats for the past 30 days across all guilds (new members, active games, moderation incidents count). On-demand only, no automatic DM spam.
- [ ] **`/setup resume`** — Resume the wizard from anywhere via slash command


---

## 🚀 Post-v1.0.0 Roadmap

### v1.1 — Moderation (guild-level)
> ⚠️ All moderation features target **guild admins only** via their configured channels/DM. The bot system admin (BOT_ADMIN_ID) has no visibility into per-guild users, bans or sanctions.

| Feature | Description |
|---------|-------------|
| Temporary sanctions | Mute/ban with automatic expiration — stored in DB, lifted automatically |
| `/warn` with thresholds | Auto-escalation per guild config: warn → mute → kick → ban |
| Moderation log export | Export `#guardian-logs` entries as CSV |
| Anti-raid | Mass join detection and temporary channel lockdown |

### v1.2 — UX & Commands
| Feature | Description |
|---------|-------------|
| `/setup resume` | Resume the wizard from any step via slash command |
| `/status` (guild) | Display current server config state without opening the wizard |
| Error watchdog counter | Track `uncaughtException` count in bot admin panel Status view |

### v1.3 — Games & Community
| Feature | Description |
|---------|-------------|
| Steam notifications | Direct Steam API webhook instead of polling |
| Forum Channels support | Forum Channels for suggestions and reports |
| Behavior leaderboard | Member ranking by behavior score, visible in a dedicated channel |
| Multi-server config copy | Copy Guardian config from one guild to another (for multi-community managers) |

### v1.4 — Extended i18n
| Feature | Description |
|---------|-------------|
| More languages | NL, PL, RU, ZH, JA, KO — structure ready, JSON files to create |

### v1.5 — Admin & Infrastructure
| Feature | Description |
|---------|-------------|
| Config export/import | Save/restore a complete server configuration as JSON |
| Web dashboard | Lightweight interface to view bot-level stats and logs without Discord |
| Internal REST API | Endpoints for third-party integrations (incoming webhooks, stats) |


---

## 🤝 Contributing

Issues and pull requests are welcome. Please follow the [Conventional Commits](https://www.conventionalcommits.org/) convention.

---

<div align="center">
  <sub>Made with ❤️ for Discord gaming communities</sub>
</div>
