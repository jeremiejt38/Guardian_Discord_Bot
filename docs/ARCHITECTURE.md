# Architecture — Guardian Discord Bot

## Vue d'ensemble

Guardian est un bot Discord communautaire mono-instance, écrit en Node.js avec discord.js v14.
Il utilise une base SQLite locale (via `node:sqlite`) sans ORM.

```
guardian/
├── index.js                     # Point d'entrée, chargement des events
├── deploy-commands.js           # Déploiement des slash commands via REST
├── config.js                    # Constantes globales (CHANNELS, GRADE_NAMES, etc.)
├── database/
│   └── db.js                    # init, migrations, getDb(), helpers CRUD
├── commands/
│   ├── setup.js                 # /setup — wizard d'installation
│   ├── admin.js                 # /admin — commandes admin bot (setpremium, etc.)
│   └── ...
├── events/
│   ├── interactionCreate.js     # Dispatcher central de toutes les interactions
│   ├── guildMemberAdd.js        # Nouveau membre → role invité + DM
│   ├── threadCreate.js          # Nouveau thread → gestion suggestions (premium)
│   ├── ready.js                 # Bot prêt → init crons
│   └── ...
├── modules/
│   ├── tier/
│   │   ├── tier.js              # isPremium(), checkTier(), activatePremium()
│   │   └── premiumGate.js       # buildPremiumLockButton(), handlePremiumGateClick()
│   ├── initialisation/
│   │   ├── setup.js             # Création des canaux/rôles Discord
│   │   ├── setupHandlers.js     # Dispatcher (54 lignes) → handlers/
│   │   └── handlers/
│   │       ├── _sharedContext.js   # Imports communs aux handlers
│   │       ├── setupStep1Grades.js
│   │       ├── setupStep2Modules.js
│   │       ├── setupStep3Channels.js
│   │       ├── setupStep4Members.js
│   │       ├── setupStep5Vocal.js
│   │       ├── setupStep6Games.js
│   │       ├── setupStep7Moderation.js
│   │       ├── setupStep4Security.js
│   │       ├── setupStep8Discord.js  # @premium-start/end
│   │       └── setupNav.js
│   ├── config/
│   │   ├── settings.js          # getGuildSetting / setGuildSetting (JSON dans guild_config)
│   │   ├── membresPanel.js      # Panneau membres + DM bienvenue custom (premium)
│   │   └── channelsPanel.js     # Toggles canaux (suggestions/server_list gatés)
│   ├── moderation/
│   │   ├── behavior.js          # Score comportemental + checkBehaviorThresholds (premium)
│   │   └── behaviorPanel.js     # UI seuils comportementaux (cadenas en free)
│   ├── members/
│   │   ├── newMember.js         # handleNewMember → DM bienvenue (custom en premium)
│   │   └── welcomeMessage.js    # Template DM bienvenue (premium) — {name}/{server}/etc.
│   ├── suggestions/
│   │   └── suggestions.js       # Forum suggestions avec statuts (premium)
│   ├── servers/
│   │   ├── interaction.js       # Proposition/approbation serveurs (gate premium)
│   │   └── serverMonitor.js     # Ping TCP + embed statut dans #server-list
│   ├── games/                   # Gestion jeux Steam + non-Steam
│   ├── logs/                    # Logger Winston + logToDiscord
│   ├── crypto/                  # Chiffrement secrets (AES-256-GCM)
│   └── utils/                   # interactions, channels, roles, rateLimit, etc.
└── tests/                       # ~150 tests node:test
```

## Flux d'interaction

```
Discord → interactionCreate.js
  ├─ premium:gate:* → handlePremiumGateClick (éphémère premium info)
  ├─ suggestions:status:* → handleSuggestionInteraction (premium)
  ├─ slash command → commands/*.js
  ├─ setup:* → setupHandlers.js → handlers/setup*.js
  ├─ membres:* → membresPanel.js
  ├─ behavior:* → behaviorPanel.js
  ├─ servers:* → servers/interaction.js
  └─ ...
```

## Système de tier (Premium)

```
guild_tier (BDD)
  └─ guild_id TEXT, tier TEXT (free|premium), expires_at INTEGER, updated_at TEXT

tier.js
  ├─ isPremium(guildId) → boolean
  ├─ checkTier(guildId) → 'free'|'premium'
  ├─ activatePremium(guildId, days|null)
  └─ deactivatePremium(guildId)

premiumGate.js
  ├─ buildPremiumLockButton(featureKey, label) → ButtonBuilder (🔒 label, Secondary)
  ├─ handlePremiumGateClick(interaction) → reply éphémère avec info premium
  └─ isPremiumGateClick(interaction) → boolean
```

## Features Premium

| Feature | Guard | UI |
|---------|-------|-----|
| Sanctions auto comportementales | `isPremium()` dans `checkBehaviorThresholds` | cadenas dans `behaviorPanel.js` |
| Welcome DM custom | `isPremium()` dans `buildCustomWelcomeDm` | bouton ✉️/🔒 dans `membresPanel.js` |
| Forum suggestions + statuts | `isPremium()` dans `handleNewSuggestionThread` | boutons statuts, cadenas toggle |
| Server list — propositions | `isPremium()` dans `handleServerModalSubmit` | bouton 🔒 dans `channelsPanel.js` |
| Discord natifs (AFK/AutoMod/Onboarding) | `@premium-start/end` blocs step 2/4/8 | — |

## Conventions de code

- `@premium-start` / `@premium-end` : balises pour le build script (version free = strip ces blocs)
- `freshModule(path)` dans les tests : reset du cache require pour tests isolés avec DB temp
- Migrations versionnées dans `MIGRATIONS[]` dans `db.js` (v1 → v9)
- Tous les settings guild en JSON dans `guild_config(guild_id, module, key, value)`

## Base de données — tables clés

| Table | Rôle |
|-------|------|
| `guilds` | Enregistrement des guilds, flag `setup_done` |
| `guild_config` | Settings JSON par guild (module + key) |
| `guild_tier` | Statut premium par guild (v9) |
| `members` | Membres, grade, score comportemental |
| `grades` | Mapping grade → role_id Discord |
| `schema_version` | Version migration BDD appliquée |

## Crons (ready.js)

- **Expulsion invités** : toutes les heures
- **Regen score passif** : toutes les heures
- **Server monitor** (TCP ping) : configurable
- **Steam changelog** : premium, quotidien
