<div align="center">

# 🛡️ Guardian

**Bot Discord communautaire tout-en-un pour serveurs de gaming**

[![Version](https://img.shields.io/badge/version-v0.11.0-blue?style=flat-square)](https://github.com/jeremiejt38/Guardian_Discord_Bot/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen?style=flat-square)](#tests)

*Gestion des membres, des jeux, des vocaux temporaires, de la modération et de la configuration — tout depuis un wizard Discord interactif.*

</div>

---

## ✨ Fonctionnalités

| Module | Description |
|--------|-------------|
| 🧙 **Setup wizard** | Configuration guidée en 8 étapes directement dans Discord |
| 👥 **Membres** | Onboarding Invite → Membre, parrainage, score comportemental |
| 🎮 **Jeux** | Opt-in par jeu, channels dédiés (chat / galerie / updates), intégration Steam |
| 🔊 **Vocaux temporaires** | Création à la demande, suppression auto, préfixe/suffixe/limite |
| 🛡️ **Modération** | Anti-spam, blacklist, logs, score comportemental, expulsion auto |
| 🖥️ **Serveurs de jeu** | Proposition, approbation et suivi des serveurs communautaires |
| ⚙️ **Panels de config** | Panneaux d'administration persistants par module (channels, rôles, jeux…) |
| 🔔 **Notifications DM** | Alertes privées configurables par catégorie (MAJ bot, erreurs, modération, promotions…) |
| 🔄 **Migrations** | Migrations DB et Discord versionnées — montées de version sans perte de données |
| 🌐 **i18n** | Support français / anglais avec clés de traduction complètes |

---

## 🚀 Démarrage rapide

### Prérequis

- [Node.js](https://nodejs.org) ≥ 18
- Un bot Discord (token + application ID depuis le [Developer Portal](https://discord.com/developers/applications))

### Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/jeremiejt38/Guardian_Discord_Bot.git
cd Guardian_Discord_Bot/guardian

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# → éditer .env avec ton token, application ID, etc.

# 4. Déployer les slash commands
npm run deploy-commands

# 5. Lancer le bot
npm start
```

### Variables d'environnement

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Token du bot Discord |
| `APPLICATION_ID` | ID de l'application Discord |
| `STEAM_API_KEY` | *(optionnel)* Clé API Steam pour les changelogs |

---

## 🗂️ Structure du projet

```
Guardian_Discord_Bot/
├── guardian/
│   ├── commands/          # Slash commands (/ban, /config-games, …)
│   ├── database/          # Schéma SQLite + migrations
│   ├── events/            # Handlers Discord (ready, guildCreate, interactionCreate…)
│   ├── locales/           # Fichiers de traduction (fr.json, en.json)
│   ├── modules/
│   │   ├── config/        # Panels de configuration admin
│   │   ├── games/         # Gestion jeux, opt-in, Steam changelogs
│   │   ├── initialisation/# Wizard setup, création channels/rôles, seeds
│   │   ├── members/       # Promotions, parrainage, score comportemental
│   │   ├── migrations/    # Migrations Discord versionnées (channels, rôles)
│   │   ├── moderation/    # Anti-spam, blacklist, logs de modération
│   │   ├── notifications/ # Notifications DM configurables par guilde
│   │   ├── servers/       # Monitor serveurs de jeu
│   │   └── utils/         # Utilitaires partagés (discordErrors, channels…)
│   └── tests/             # Suite de tests unitaires
└── .lando.yml             # Environnement de test isolé (Docker)
```

---

## 🧪 Tests

```bash
cd guardian
npm test
```

Les tests tournent sur une base SQLite en mémoire et couvrent le wizard setup, les panels de config, les jeux et la modération.
Les **tests E2E** (`tests/e2e.test.js`) couvrent 6 flows d'intégration complets : setup, jeux, membres, modération, migrations, notifications.

---

## Changelog

### v0.11.x — Résilience & MAJ
| Version | Date | Contenu |
|---------|------|---------|  
| **v0.11.0** | 2026-07-06 | Nouvelles options MAJ wizard + backup/restore config via `#guardian-backup`, 95 tests ← *actuel* |

### v0.10.x — Robustesse & Notifications
| Version | Date | Contenu |
|---------|------|---------|
| **v0.10.5** | 2026-07-06 | Tests E2E intégration — 8 tests, 6 flows complets (setup, jeux, membres, modération, migrations, notifs), 89 tests total ← *actuel* |
| v0.10.4 | 2026-07-06 | Commande `/help` contextuelle — 7 modules, embeds couleur, i18n FR+EN |
| v0.10.3 | 2026-07-06 | Gestion erreurs Discord 50013/50001 — `safeDiscordAction`, filet global `interactionCreate` |
| v0.10.2 | 2026-07-06 | Validation `#général` requis step 3 + pagination jeux step 6 (3/page, illimité) |
| v0.10.1 | 2026-07-06 | Migrations DB versionnées (`MIGRATIONS` array), migrations Discord versionnées (`channelMigrations`), version bot dans wizard |
| v0.10.0 | 2026-07-06 | Notifications DM configurables — 8 catégories, panel `#guardian`, détection MAJ bot au démarrage |

### v0.9.x — UX & Polish
| Version | Date | Contenu |
|---------|------|---------|
| **v0.9.3** | 2026-07-06 | Écran communautaire enrichi (prérequis vérifiés dynamiquement, avantages, procédure), polish UX steps 2/5/7, i18n FR+EN aligné |
| v0.9.2 | 2026-07-06 | README réécriture complète, badges, tableau versioning |
| v0.9.1 | 2026-07-06 | Détection jeux existants au setup, liaison channels par jeu, `text_channel_enabled` désactivé par défaut, emojis sur tous les boutons |
| v0.9.0 | 2026-07-05 | Topics i18n sur tous les channels Guardian, suppression messages `configReady`, slots `communityOnly` filtrés |

### v0.8.x — Wizard setup complet
| Version | Date | Contenu |
|---------|------|---------|
| v0.8.3 | 2026-07-04 | Channels Informations hors catégorie, catégorie setup en position 0, curseur step 3 fresh install |
| v0.8.2 | 2026-07-04 | Recréation automatique du channel setup, fix anti-doublon `adoptLinkedChannels`, suppression channels orphelins |
| v0.8.1 | 2026-07-04 | Panels `#bot` et `#guardian`, restructuration config (fusion jeux/changelogs/serveurs), adoption channels liés |
| v0.8.0 | 2026-07-03 | Wizard setup interactif 8 étapes complet, `guildCreate` auto-setup, seeds, onboarding, i18n |

### v0.7.x — Configuration persistante
| Version | Date | Contenu |
|---------|------|---------|
| v0.7.0 | 2026-06-xx | Surfaces de configuration persistantes (panels config, i18n, permissions, panneaux admin) |

### v0.6.x — Modération
| Version | Date | Contenu |
|---------|------|---------|
| v0.6.0 | 2026-06-xx | Modération complète : score comportemental, blacklist, anti-spam, logs, Steam changelogs |

### v0.5.x — Vocaux
| Version | Date | Contenu |
|---------|------|---------|
| v0.5.0 | 2026-06-xx | Salons vocaux temporaires : création à la demande, suppression auto, préfixe/suffixe/limite |

### v0.4.x — Jeux
| Version | Date | Contenu |
|---------|------|---------|
| v0.4.0 | 2026-06-xx | Opt-in jeux, gestion serveurs de jeu, intégration Steam Store API |

### v0.3.x — Membres
| Version | Date | Contenu |
|---------|------|---------|
| v0.3.0 | 2026-06-xx | Workflow membres & promotions (Invite → Membre, parrainage, expulsion auto) |

### v0.2.x — Initialisation
| Version | Date | Contenu |
|---------|------|---------|
| v0.2.0 | 2026-06-xx | Flow d'initialisation Guardian (wizard, rôles, channels, onboarding) |

### v0.1.x — Fondations
| Version | Date | Contenu |
|---------|------|---------|
| v0.1.0 | 2026-06-xx | Scaffold architecture (modules, BDD SQLite, structure de base) |

---

## 🎯 Roadmap v1.0.0

Ce qui reste à faire avant la **release publique** :

### 🔴 Bloquant
- [x] **Tests d'intégration end-to-end** — 8 tests E2E, 6 flows complets, 95 tests total ✅ v0.10.5
- [x] **Gestion des erreurs Discord 50013** — `safeDiscordAction` + filet global interactionCreate ✅ v0.10.3
- [x] **Migration DB automatique** — système `MIGRATIONS` array versionné ✅ v0.10.1
- [x] **Commande `/help`** — aide contextuelle 7 modules, embeds, i18n ✅ v0.10.4

### 🟠 Important
- [ ] **Multi-langues** — ajouter ES, DE, PT, IT, NL, PL, RU, ZH, JA, KO (structure prête, fichiers JSON à créer)
- [ ] **Résumé post-installation** — message `#bienvenue` avec checklist des prochaines actions admins
- [x] **Pagination liste de jeux** — 3 jeux par page, illimité ✅ v0.10.2
- [x] **Validation step 3** — `#général` requis avant passage à l'étape suivante ✅ v0.10.2
- [ ] **Rate limiting** — protection contre les interactions trop rapides (debounce sur les boutons)

### 🟡 Nice-to-have
- [ ] **Tableau de bord web** — interface légère pour visualiser les stats sans ouvrir Discord
- [ ] **Notifications Steam** — webhook direct depuis l'API Steam au lieu du polling
- [ ] **Export config** — sauvegarder/restaurer la configuration d'un serveur en JSON
- [ ] **Commande `/setup resume`** — reprendre le wizard depuis n'importe où via slash command
- [ ] **Support forums Discord** — utiliser les Forum Channels pour suggestions et reports

### ✅ Déjà fait (depuis v0.8.0)
- [x] Wizard setup 8 étapes avec navigation complète
- [x] Détection serveur communautaire avec prérequis vérifiés dynamiquement
- [x] Détection et liaison automatique des channels de jeux existants
- [x] `text_channel_enabled` désactivé par défaut, activable par jeu
- [x] Polish UX complet (emojis, mise en page, descriptions claires)
- [x] i18n FR + EN aligné sur toutes les clés
- [x] Versioning sémantique complet (v0.1.0 → v0.10.3)
- [x] Notifications DM configurables — 8 catégories, panel `#guardian`
- [x] Migrations DB + Discord versionnées
- [x] Gestion erreurs Discord 50013 — crash silencieux éliminé
- [x] Pagination jeux illimitée dans le wizard
- [x] Commande `/help` contextuelle par module
- [x] Tests E2E intégration — 6 flows complets, 95 tests
- [x] Nouvelles options MAJ wizard — détection slots non configurés après mise à jour
- [x] Backup/restore config — `#guardian-backup`, snapshot JSON base64, restauration automatique au démarrage

---

## 🚀 Roadmap post-v1.0.0

Fonctionnalités prévues après la release publique, classées par priorité :

### v1.1 — Commande `/help` & UX
| Feature | Description |
|---------|-------------|
| `/help` | Aide contextuelle par module avec exemples de commandes |
| Rate limiting | Debounce sur les boutons pour éviter les doubles actions |
| Résumé post-install | Message `#bienvenue` avec checklist des prochaines étapes admin |

### v1.2 — Internationalisation
| Feature | Description |
|---------|-------------|
| Multi-langues | ES, DE, PT, IT, NL, PL, RU, ZH, JA, KO — structure prête, JSON à créer |
| Détection langue automatique | Proposer la langue selon les paramètres Discord du serveur |

### v1.3 — Modération avancée
| Feature | Description |
|---------|-------------|
| Sanctions temporaires | Mute/ban avec expiration automatique |
| `/warn` avec seuils | Escalade automatique (warn → mute → kick → ban) |
| Logs enrichis | Export des logs de modération en CSV |
| Anti-raid | Détection de join massif et verrouillage temporaire |

### v1.4 — Jeux & Communauté
| Feature | Description |
|---------|-------------|
| Notifications Steam | Webhook direct API Steam au lieu du polling |
| `/setup resume` | Reprendre le wizard depuis n'importe où via slash command |
| Support forums Discord | Forum Channels pour suggestions et rapports |
| Leaderboard comportemental | Classement des membres par score comportemental |

### v1.5 — Administration & Infra
| Feature | Description |
|---------|-------------|
| Export/import config | Sauvegarder/restaurer la configuration complète d'un serveur en JSON |
| Multi-bot support | Guardian peut gérer plusieurs bots sur le même serveur |
| Tableau de bord web | Interface légère pour visualiser stats et logs sans ouvrir Discord |
| API REST interne | Endpoints pour intégrations tierces (webhooks entrants, stats) |

---

## 🤝 Contribution

Les issues et pull requests sont les bienvenues. Merci de respecter la convention de commits [Conventional Commits](https://www.conventionalcommits.org/).

---

<div align="center">
  <sub>Fait avec ❤️ pour les communautés gaming Discord</sub>
</div>
