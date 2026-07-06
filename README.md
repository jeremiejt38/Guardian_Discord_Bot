<div align="center">

# 🛡️ Guardian

**Bot Discord communautaire tout-en-un pour serveurs de gaming**

[![Version](https://img.shields.io/badge/version-v0.9.3-blue?style=flat-square)](https://github.com/jeremiejt38/Guardian_Discord_Bot/releases)
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
│   │   ├── moderation/    # Anti-spam, blacklist, logs de modération
│   │   ├── servers/       # Monitor serveurs de jeu
│   │   └── utils/         # Utilitaires partagés
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

---

## 🐳 Environnement Lando (optionnel)

[Lando](https://lando.dev) fournit un environnement Node 22 isolé pour le développement et les tests CI.

```bash
# Démarrer les services
lando start

# Installer les dépendances dans le conteneur
lando install

# Lancer les tests
lando test
```

**Commandes utiles**

| Commande | Action |
|----------|--------|
| `lando ci` | Install propre avec lockfile |
| `lando test-watch` | Tests en mode watch |
| `lando start-bot` | Démarrer le bot dans le conteneur |
| `lando deploy-commands` | Déployer les slash commands |
| `lando shell` | Shell dans le service app |

> **Note :** Lando force `NODE_ENV=test` avec des tokens factices et utilise `/tmp/guardian-test.db` pour isoler la base de test.

---

## 📦 Changelog

### v0.9.x — UX & Polish
| Version | Date | Contenu |
|---------|------|---------|
| **v0.9.3** | 2026-07-06 | Écran communautaire enrichi (prérequis vérifiés dynamiquement, avantages, procédure), polish UX steps 2/5/7, i18n FR+EN aligné ← *actuel* |
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
- [ ] **Tests d'intégration end-to-end** — couvrir les flows complets (setup → finalisation → jeu → modération)
- [ ] **Gestion des erreurs Discord 50013** — permissions manquantes : afficher un message explicite au lieu de crash silencieux
- [ ] **Migration DB automatique** — gérer les montées de version de schéma sans perte de données
- [ ] **Commande `/help`** — aide contextuelle par module avec exemples

### 🟠 Important
- [ ] **Multi-langues** — ajouter ES, DE, PT, IT, NL, PL, RU, ZH, JA, KO (structure prête, fichiers JSON à créer)
- [ ] **Résumé post-installation** — message `#bienvenue` avec checklist des prochaines actions admins
- [ ] **Pagination liste de jeux** — dépasser la limite de 3 jeux modifiables dans le wizard
- [ ] **Validation step 3** — vérifier que le channel `#général` est bien configuré avant de passer à l'étape suivante
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
- [x] Versioning sémantique complet (v0.1.0 → v0.9.3)

---

## 🤝 Contribution

Les issues et pull requests sont les bienvenues. Merci de respecter la convention de commits [Conventional Commits](https://www.conventionalcommits.org/).

---

<div align="center">
  <sub>Fait avec ❤️ pour les communautés gaming Discord</sub>
</div>
