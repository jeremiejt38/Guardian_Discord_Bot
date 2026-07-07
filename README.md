<div align="center">

# 🛡️ Guardian

**Bot Discord communautaire tout-en-un pour serveurs de gaming**

[![Version](https://img.shields.io/badge/version-v0.21.1-blue?style=flat-square)](https://github.com/jeremiejt38/Guardian_Discord_Bot/releases)
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

### v0.21.x — Admin Panel DM ← *actuel*
| Version | Date | Contenu |
|---------|------|---------|
| **v0.21.1** | 2026-07-08 | Fix: Admin Panel — bouton 🔄 devient ✖ Fermer quand une vue est active, annule le timeout ← *actuel* |
| v0.21.0 | 2026-07-08 | Feat: panneau admin système en DM — 4 vues (Statut/Serveurs/BDD/Notifs), toggles alertes, timeout 15min, bootstrap automatique, `/admin`, alertes guild join/leave |

### v0.20.x — Auto-update & Admin bot
| Version | Date | Contenu |
|---------|------|---------|
| **v0.20.0** | 2026-07-07 | Feat: `BOT_ADMIN_ID` dans `.env` — mise à jour automatique via bouton DM (`git pull` + `npm install` + redémarrage PM2) |

### v0.19.x — RAWG.io & Jeux non-Steam
| Version | Date | Contenu |
|---------|------|---------|
| **v0.19.13** | 2026-07-07 | Fix: boutons toggle — pastilles 🟢/🔴 supprimées, couleur du bouton (vert/gris) indique l'état |
| v0.19.12 | 2026-07-07 | Fix: step 3 — boutons adaptatifs selon l'état du slot : "Suivant ▶" si déjà configuré, "Guardian crée / Ignorer" si non configuré |
| v0.19.11 | 2026-07-07 | Fix: step 3 — espacement entre icône statut et curseur ▶ |
| v0.19.10 | 2026-07-07 | Fix: step 3 — icône ✅/❌ conservée sur le slot actif + curseur ▶ affiché après l'icône |
| v0.19.9 | 2026-07-07 | Fix: boutons "Créer le rôle" et "Laisser Guardian créer" désactivés si rôle/channel déjà configuré (anti-doublon) |
| v0.19.8 | 2026-07-07 | Fix: setup Intégrer — force step=1, reset `roles_auto_created` + placeholders `(changer ?)` étapes 3 et game-link |
| v0.19.7 | 2026-07-07 | Feat: `postSetupSummary` dynamique — récap config réelle dans `#bienvenue` (rôles, jeux, modules, prochaines étapes) |
| v0.19.6 | 2026-07-07 | Test: couverture i18n — vérification langues es/pt/it chargées et traduites |
| v0.19.5 | 2026-07-07 | Feat: multi-langues ES/PT/IT — fichiers locales complets + README changelog v0.16→v0.19 |
| v0.19.4 | 2026-07-07 | Fix: modal edit jeu setup — `deferUpdate` au lieu de `deferReply` (erreur Discord corrigée) |
| v0.19.3 | 2026-07-07 | Fix: détection auto channels Guardian avec accents et matching fuzzy |
| v0.19.2 | 2026-07-07 | Fix: channels génériques avec accents (`général`, etc.) filtrés correctement |
| v0.19.1 | 2026-07-07 | Fix: setup re-run — rôles déjà mappés modifiables (placeholder dynamique) |
| **v0.19.0** | 2026-07-07 | Intégration RAWG.io pour jeux non-Steam — `rawgApi.js`, migration DB v7 `rawg_id`, clé RAWG dans `#bot`, pseudo App ID `000XXXXXXX` |

### v0.18.x — Jeux non-Steam
| Version | Date | Contenu |
|---------|------|---------|
| **v0.18.0** | 2026-07-07 | Support jeux non-Steam — pseudo App ID `000XXXXXXX`, `generateNonSteamId()`, `isNonSteamId()`, fix doublons détection |

### v0.17.x — Backup & Diagnostic
| Version | Date | Contenu |
|---------|------|---------|
| **v0.17.0** | 2026-07-07 | Backup message protection, `guardian-logs` enrichis, diagnostic bot panel, serveurs de jeu mot de passe |

### v0.16.x — Setup UX & Game Requests
| Version | Date | Contenu |
|---------|------|---------|
| **v0.16.0** | 2026-07-07 | Setup UX amélioré, game requests membres, topics channels, couleurs rôles |

### v0.15.x — MAJ automatique & prerelease
| Version | Date | Contenu |
|---------|------|---------|
| **v0.15.0** | 2026-07-07 | Feat: MAJ automatique stable + confirmation DM prerelease (champ `prerelease` dans package.json) |

### v0.14.x — Setup UX & Onboarding
| Version | Date | Contenu |
|---------|------|---------|  
| **v0.14.0** | 2026-07-07 | Fix création des rôles un par un grade par grade (label dynamique, transfert/recréation individuel) |
| v0.13.2 | 2026-07-07 | Fix bouton « Créer les rôles auto » toujours visible même quand des rôles existent |
| v0.13.1 | 2026-07-07 | Étape de révision des jeux détectés avant gameLink (supprimer/ajouter/continuer) |
| v0.13.0 | 2026-07-07 | Channel `#devenir-membre` + DM enrichi nouveaux membres + notification bulk membres au finalize |
| v0.12.2 | 2026-07-07 | DM automatique à l'owner quand setup `guardian_partial` détecté au démarrage |
| v0.12.1 | 2026-07-07 | Fix FAQ créée comme channel texte au lieu d'un forum |
| v0.12.0 | 2026-07-07 | Topics sur tous les channels Guardian + messages seed auto-supprimés après 8s |

### v0.11.x — Résilience, Sécurité & UX Setup
| Version | Date | Contenu |
|---------|------|---------|
| v0.11.13 | 2026-07-07 | Fix déplacer channel jeu existant dans la bonne catégorie (pas de doublon en bas) |
| v0.11.12 | 2026-07-07 | Feat détection auto channels Guardian step 3 + pré-remplissage + tri pertinence select + renommage Vocal Général→Général |
| v0.11.11 | 2026-07-07 | Feat tri intelligent channels gamelink + détection jeux stricte + bouton Tout effacer |
| v0.11.10 | 2026-07-07 | Feat repositionnement auto rôle bot au-dessus du rôle Owner lors du setup |
| v0.11.9 | 2026-07-07 | Feat audit rôles — pastilles colorées, modal confirmation, boutons Tout supprimer/conserver |
| v0.11.8 | 2026-07-07 | Feat audit sécurité rôles — permissions dangereuses + rôles inutilisés + 100% i18n |
| v0.11.7 | 2026-07-07 | Feat détection invitant bot (BotAdd) + DM guildCreate traduit (fr/en) + auto-détection langue |
| v0.11.6 | 2026-07-07 | Feat détection jeux Steam top 250 hardcodée + match fuzzy + aliases (cs2/gta/lol/bg3…) |
| v0.11.5 | 2026-07-07 | UX auto-avance après sélection — grade suivant (step 1), jeu suivant (step 6) |
| v0.11.4 | 2026-07-07 | Fix `#guardian-backup` placé dans catégorie ⚙️ Configuration |
| v0.11.3 | 2026-07-07 | Feat `#guardian-backup` — position bas, protection suppression, alerte DM owner/manager |
| v0.11.2 | 2026-07-07 | Docs README v0.11.x — changelog release, roadmap post-v1.0.0 |
| v0.11.1 | 2026-07-06 | Rate limiting / debounce boutons — 4 niveaux 600ms→5s, cleanup auto, 102 tests |
| v0.11.0 | 2026-07-06 | Nouvelles options MAJ wizard + backup/restore config via `#guardian-backup` |

### v0.10.x — Robustesse & Notifications
| Version | Date | Contenu |
|---------|------|---------|
| v0.10.7 | 2026-07-06 | Tests E2E intégration — 6 flows complets (setup, jeux, membres, modération, migrations, notifs) |
| v0.10.6 | 2026-07-06 | Commande `/help` contextuelle — 7 modules, embeds couleur, i18n FR+EN |
| v0.10.5 | 2026-07-06 | Chore: bump version + suppression module richPresence orphelin + logger.debug |
| v0.10.4 | 2026-07-06 | Gestion erreurs Discord 50013/50001 — `safeDiscordAction`, filet global `interactionCreate` |
| v0.10.3 | 2026-07-06 | Validation `#général` requis step 3 + pagination jeux step 6 (3/page, illimité) |
| v0.10.2 | 2026-07-06 | Migrations Discord versionnées (`channelMigrations`), version bot dans wizard |
| v0.10.1 | 2026-07-06 | Refactor: migration DB versionnée (MIGRATIONS array) + logger dans db.js |
| v0.10.0 | 2026-07-06 | Notifications DM configurables — 8 catégories, panel `#guardian`, détection MAJ bot au démarrage |

### v0.9.x — UX & Polish
| Version | Date | Contenu |
|---------|------|---------|
| v0.9.6 | 2026-07-06 | UX: écran communautaire enrichi, polish steps 2/5/7, i18n FR+EN aligné |
| v0.9.5 | 2026-07-06 | Docs: README v0.9.2 — changelog, roadmap |
| v0.9.4 | 2026-07-06 | Docs: README réécriture complète, badges, tableau versioning |
| v0.9.3 | 2026-07-06 | Security: gate server buttons + tests 13 modules + patch undici |
| v0.9.2 | 2026-07-06 | Feat: modLog.js + /config-games + text_channel_enabled + step8 résumé + i18n DE |
| v0.9.1 | 2026-07-06 | Feat: détection jeux existants + liaison channels + `text_channel_enabled` désactivé + emojis boutons |
| v0.9.0 | 2026-07-05 | Topics i18n sur tous les channels Guardian, suppression messages `configReady`, slots `communityOnly` filtrés |

### v0.8.x — Wizard setup complet
| Version | Date | Contenu |
|---------|------|---------|
| v0.8.15 | 2026-07-05 | Feat: channels Informations hors catégorie + GuildAnnouncement + avertissement non-communautaire |
| v0.8.14 | 2026-07-04 | Fix: catégorie setup position 0 + curseur step 3 repart de 0 sur fresh install |
| v0.8.13 | 2026-07-04 | Cleanup: suppression fichiers obsolètes, fusion fr.json |
| v0.8.12 | 2026-07-04 | Fix: recréation automatique du channel setup si absent lors du re-ajout du bot |
| v0.8.11 | 2026-07-04 | Feat: adoptLinkedChannels + suppression orphelins + maj-securite channel + réordonnancement slots |
| v0.8.10 | 2026-07-04 | Feat: panels `#bot` et `#guardian` + restructuration config + adoption channels liés |
| v0.8.9 | 2026-07-04 | Fix: vocal temp, seeds, createRolesAutoHelper, deploy-commands, step3 slots, tempVoice rétrocompat |
| v0.8.8 | 2026-07-04 | Feat: catégories emoji+majuscule ordre canonique + guildCreate auto-setup + re-join conserve paramètres |
| v0.8.7 | 2026-07-04 | Feat: step6 toggle galerie/changelog/texte, Steam Store API, modal édition, max 3 jeux boutons |
| v0.8.6 | 2026-07-04 | UX: step1 toggle Invité + step6 modal ajout/modifier/supprimer jeu + boutons Reprendre/Finaliser + pastilles |
| v0.8.5 | 2026-07-04 | Feat: wizard 7 étapes — step4 Vocaux, welcome_text, blacklist_words, récap + purge setup au démarrage |
| v0.8.4 | 2026-07-04 | Feat: setup context detection fresh/existing/reinstall + auto-map roles + flux 3 cas |
| v0.8.3 | 2026-07-04 | Feat: slow mode panel + behavior thresholds panel + spec compliance config panels |
| v0.8.2 | 2026-07-04 | Feat: setup wizard spec-aligned + members promotion flow + reports module + i18n |
| v0.8.1 | 2026-07-04 | Refactor: shared utilities — moderation-role helper, replyEphemeral, memberHasAnyRole |
| v0.8.0 | 2026-07-03 | Wizard setup interactif 8 étapes complet, `guildCreate` auto-setup, seeds, onboarding, i18n |

### v0.7.x — Configuration persistante
| Version | Date | Contenu |
|---------|------|---------|
| v0.7.2 | 2026-07-03 | Fix(servers): NULL default last_status + test intégration servers persistence |
| v0.7.1 | 2026-07-03 | Feat(init): interactive setup, seeds, onboarding channels, servers & i18n — squash |
| v0.7.0 | 2026-06-xx | Surfaces de configuration persistantes (panels config, i18n, permissions, panneaux admin) |

### v0.6.x — Modération
| Version | Date | Contenu |
|---------|------|---------|
| v0.6.0 | 2026-06-xx | Modération complète : score comportemental, blacklist, anti-spam, logs, Steam changelogs |

### v0.5.x — Vocaux
| Version | Date | Contenu |
|---------|------|---------|
| v0.5.1 | 2026-06-xx | Feat(phase-6): modération complète et score comportemental |
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
| v0.1.1 | 2026-06-xx | Feat: strengthen guardian core setup and changelog workflow |
| v0.1.0 | 2026-06-xx | Scaffold architecture (modules, BDD SQLite, structure de base) |

---

## ✅ Roadmap v1.0.0 — En cours

Items livrés et en cours de validation avant release publique v1.0.0 :

### 🔴 Bloquant
- [x] **Tests d'intégration end-to-end** — 8 tests E2E, 6 flows complets, 95 tests total ✅ v0.10.5
- [x] **Gestion des erreurs Discord 50013** — `safeDiscordAction` + filet global interactionCreate ✅ v0.10.3
- [x] **Migration DB automatique** — système `MIGRATIONS` array versionné ✅ v0.10.1
- [x] **Commande `/help`** — aide contextuelle 7 modules, embeds, i18n ✅ v0.10.4

### 🟠 Important
- [x] **Multi-langues** — ES, PT, IT + DE livrés (FR+EN déjà présents) ✅ v0.19.5
- [x] **Résumé post-installation** — message dynamique `#bienvenue` avec rôles, jeux, modules, prochaines étapes ✅ v0.19.7
- [x] **Pagination liste de jeux** — 3 jeux par page, illimité ✅ v0.10.2
- [x] **Validation step 3** — `#général` requis avant passage à l'étape suivante ✅ v0.10.2
- [x] **Rate limiting** — debounce 4 niveaux 600ms→5s, `rateLimit.js`, cleanup auto ✅ v0.11.1

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
- [x] Versioning sémantique complet (v0.1.0 → v0.19.8, 77 tags annotés)
- [x] Notifications DM configurables — 8 catégories, panel `#guardian`
- [x] Migrations DB + Discord versionnées
- [x] Gestion erreurs Discord 50013 — crash silencieux éliminé
- [x] Pagination jeux illimitée dans le wizard
- [x] Commande `/help` contextuelle par module
- [x] Tests E2E intégration — 6 flows complets, 95 tests
- [x] Nouvelles options MAJ wizard — détection slots non configurés après mise à jour
- [x] Backup/restore config — `#guardian-backup`, snapshot JSON base64, restauration automatique au démarrage
- [x] Rate limiting debounce — protection double-clic, 4 niveaux de délai
- [x] Topics sur tous les channels Guardian — descriptions affichées à côté du titre
- [x] Channel `#devenir-membre` — visible invités uniquement, infos onboarding
- [x] DM enrichi nouveaux membres — statut, expulsion auto, lien `#devenir-membre`
- [x] Notification bulk membres au finalize — DM optionnel à tout le serveur
- [x] DM owner reconnexion setup incomplet — lien direct `#setup` au démarrage
- [x] Création des rôles un par un — label dynamique, transfert/recréation grade par grade
- [x] Étape révision jeux détectés — supprimer/ajouter avant liaison channels
- [x] Multi-langues ES/PT/IT/DE — fichiers locales complets, détection automatique depuis `guild.preferredLocale`
- [x] Résumé post-installation dynamique — récap config réelle dans `#bienvenue` après finalize
- [x] Setup "Intégrer" — force step=1, reset `roles_auto_created`, placeholders `(changer ?)` partout
- [x] RAWG.io + jeux non-Steam — pseudo App ID `000XXXXXXX`, migration DB v7

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
