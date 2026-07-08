# 🔒 Modèle Freemium — Guardian Discord Bot

> Documentation interne — ne pas inclure dans le bundle free.

---

## Features Free vs Premium

### ✅ Free (auto-hébergé)

| Feature | Notes |
|---|---|
| Setup wizard complet (9 steps) | Steps 2/4/8 sans les sections Discord natifs |
| 5 grades (invite / membre / modérateur / manager / owner) | |
| 3 modes invité (classic / strict / direct) | |
| Promotion auto (délai + critères) | |
| Score comportemental | |
| Parrainage | |
| Anti-spam, blacklist | |
| Slow mode auto | |
| Logs modération (tous niveaux) | |
| Expulsion invités auto | |
| Bio obligatoire | |
| DM bienvenue | |
| Panneau membres | |
| Vocaux temporaires | Sans préfixe/suffixe/limite custom |
| Jeux | **Hard limit 15 jeux** |
| Galerie / forum / jeux non-Steam | |
| Guides serveur (génération + MAJ auto) | |
| Statut bot | |
| FR + EN + ES + PT + IT + DE | |
| Export / import BDD | |

### 🔒 Premium (hébergé par Jérémie)

| Feature | Fichiers concernés |
|---|---|
| Paramètres Discord natifs — AFK, notifs système, langue | `discordSettings.js`, `setupFlow.js` step 2 |
| Community channels — canal règles, public updates, description | `discordSettings.js`, `setupFlow.js` step 4 |
| AutoMod Discord intégration Guardian | `discordSettings.js`, `setupFlow.js` step 8 |
| Onboarding Discord | `discordSettings.js`, `setupFlow.js` step 8 |
| Sanctions automatiques sur score comportemental | À implémenter |
| Message de bienvenue personnalisé (variables) | À implémenter |
| Channel `#rejoindre` personnalisé | À implémenter |
| Préfixe / suffixe / limite vocaux temporaires | À implémenter |
| Changelog Steam automatique | À implémenter |
| Jeux illimités (> 15) | À implémenter |
| Forum suggestions + statuts | À implémenter |
| Liste de serveurs | À implémenter |
| SLA uptime | Engagement contractuel, pas de code |

---

## Convention d'annotation

Tout bloc de code premium doit être encadré par :

```js
// @premium-start
... code premium ...
// @premium-end
```

### Règles

1. **Les balises doivent être sur leur propre ligne** — pas en inline
2. **Annoter aussi les variables** utilisées uniquement par du code premium
3. **Ne pas imbriquer** les blocs `@premium-start` / `@premium-end`
4. **Annoter au plus près** — ne pas englober du code free dans un bloc premium

### Exemple correct

```js
// @premium-start
const afkCfg = getAfkConfig(guildId, guild);
const afkTimeoutLabel = AFK_TIMEOUT_LABELS[afkCfg.timeout] ?? `${afkCfg.timeout}s`;
// @premium-end

return [
  '### Modules Guardian',
  `💡 Suggestions — ${dot(c.suggestionsEnabled)}`,
  // @premium-start
  '### ⚙️ Paramètres Discord',
  `🔇 Canal AFK — ${afkChannelMention}`,
  // @premium-end
].join('\n');
```

---

## Fichiers entièrement premium

Ces fichiers sont **exclus** du bundle free (listés dans `EXCLUDE_PATHS` dans `build-free.js`) :

| Fichier | Raison |
|---|---|
| `modules/initialisation/discordSettings.js` | 100% fonctions Discord natives premium |

---

## Ajouter une nouvelle feature premium

1. Développer sur la branche `dev`
2. **Poser les balises dès le début** — pas après
3. Si c'est un fichier entièrement premium, l'ajouter dans `EXCLUDE_PATHS` dans `scripts/build-free.js`
4. Vérifier avec `npm run build:free:dry` que les blocs sont bien détectés
5. Merger `dev → beta` pour early access premium
6. Merger `beta → main` + `npm run release` pour la release stable

---

## Build script

```bash
# Vérifier ce qui sera strippé (sans écriture)
npm run build:free:dry

# Générer le bundle free dans dist/guardian-free/
npm run build:free

# Release complète (premium + free)
npm run release patch
```

Le script `scripts/build-free.js` :
- Supprime tous les blocs `@premium-start / @premium-end`
- Exclut entièrement les fichiers listés dans `EXCLUDE_PATHS`
- Copie `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `package.json`, `.env.example`

---

## Variables d'environnement freemium

| Variable | Description |
|---|---|
| `GITHUB_FREE_RELEASE_TOKEN` | Token fine-grained pour publier sur le repo free |
| `GITHUB_FREE_REPO` | `jeremiejt38/Guardian_Discord_Bot_Free` |

> À terme, quand le système de licences sera implémenté :
> - `GUARDIAN_TIER=free|premium`
> - `GUARDIAN_LICENSE_KEY=XXXX` (clé liée au guildId, validée via API Hetzner)
