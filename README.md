<div align="center">

# 🛡️ Guardian

**Bot Discord communautaire tout-en-un pour serveurs de gaming**

[![Version](https://img.shields.io/badge/version-v0.9.1-blue?style=flat-square)](https://github.com/jeremiejt38/Guardian_Discord_Bot/releases)
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

## 📦 Versioning

| Version | Contenu |
|---------|---------|
| v0.1.0 | Scaffold architecture (modules, BDD, structure) |
| v0.2.0 | Flow d'initialisation (wizard, rôles, channels) |
| v0.3.0 | Workflow membres & promotions |
| v0.4.0 | Opt-in jeux & gestion serveurs de jeu |
| v0.5.0 | Salons vocaux temporaires |
| v0.6.0 | Modération complète (score, blacklist, spam, Steam) |
| v0.7.0 | Surfaces de configuration persistantes |
| v0.8.0 | Wizard setup interactif 8 étapes complet |
| v0.9.0 | UX setup : serveurs communautaires, topics i18n, avertissements |
| **v0.9.1** | **Détection jeux existants, liaison channels, emojis boutons** ← *actuel* |
| v1.0.0 | *(à venir)* Release publique |

---

## 🤝 Contribution

Les issues et pull requests sont les bienvenues. Merci de respecter la convention de commits [Conventional Commits](https://www.conventionalcommits.org/).

---

<div align="center">
  <sub>Fait avec ❤️ pour les communautés gaming Discord</sub>
</div>
