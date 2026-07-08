# 🔒 Modèle Freemium — Guardian Discord Bot

> Documentation interne — ne pas inclure dans le bundle free.

---

## Architecture SaaS Premium — Décisions techniques

> À implémenter quand la décision de vendre est prise.
> Ce document fixe les décisions d'architecture pour ne pas les re-débattre.

### Modèle de distribution

| Version | Distribution | Hébergement |
|---|---|---|
| Free | Code téléchargeable (zip GitHub) | Self-hosted par l'utilisateur |
| Premium | Jamais distribuée | Hébergée par Jérémie sur Hetzner uniquement |

---

### Serveur propriétaire — Licence lifetime

Le serveur Discord de Jérémie (`OWNER_GUILD_ID` dans `.env`) bénéficie d'une licence lifetime hardcodée — aucune entrée en BDD requise, aucune expiration.

```js
// Vérification dans getLicense(guildId) :
if (guildId === process.env.OWNER_GUILD_ID) return { active: true, plan: 'premium', lifetime: true };
```

---

### Flux d'activation d'une licence

```
1. Acheteur paie sur le site (Stripe)
        │
        ▼ Webhook Stripe (payment_intent.succeeded)
2. API Hetzner génère un invite_token UUID :
   { token, stripe_customer_id, used: false, expires_at: now+24h }
        │
        ▼ Email transactionnel (Resend / Brevo)
3. Acheteur reçoit :
   "Cliquez ici pour ajouter Guardian Premium à votre serveur"
   https://guardian.jerem.fr/invite?token=UUID
        │
        ▼ Validation du token (usage unique + expiration 24h)
4. Site redirige vers OAuth Discord
   https://discord.com/oauth2/authorize?client_id=XXX&scope=bot&permissions=YYY&redirect_uri=...
        │
        ▼ L'utilisateur choisit son serveur sur Discord
5. Discord callback → https://guardian.jerem.fr/callback?code=ABC&guild_id=123456789
   - token marqué used: true
   - guild_id enregistré en BDD : { guild_id, active: true, expires_at, stripe_customer_id }
        │
        ▼
6. Bot Guardian rejoint le serveur
   getLicense(guild_id) → active: true → features premium actives
```

**Protections :**
- Token partagé avant usage → premier clic l'active, suivants = erreur "déjà utilisé"
- Token expiré → erreur "lien expiré, contactez le support"
- Bot ajouté sans token → guild_id absent en BDD → mode free automatique
- Code OAuth Discord → usage unique, expire en 5 minutes côté Discord

---

### Expiration d'abonnement

```
Webhook Stripe (customer.subscription.deleted / invoice.payment_failed)
        │
        ▼
API met à jour en BDD : { active: false }
        │
        ▼
Bot détecte à la prochaine vérification (au démarrage ou check périodique) :
getLicense(guild_id) → active: false
        │
        ├─ Features premium désactivées (boutons 🔒 visibles)
        │
        ├─ Export automatique généré :
        │  guardian-export-GUILD_ID-DATE.json
        │  (toute la guild_config + grades + membres + jeux)
        │
        ├─ Export envoyé par DM au owner du serveur
        │
        └─ Bot quitte le serveur automatiquement après 7 jours de grâce
           (laisse le temps à l'utilisateur de récupérer ses données)
```

**Délai de grâce : 7 jours** après expiration avant que le bot quitte le serveur.

---

### Migration bidirectionnelle Free ↔ Premium

#### Premium → Free (fin d'abonnement)

1. Export automatique envoyé par DM au owner (voir ci-dessus)
2. Format : `guardian-export-GUILD_ID-DATE.json`
3. Contient : `guild_config`, `grades`, `members`, `games`, `sanctions`, `promotion_requests`
4. **Les settings premium** (discord natifs, AutoMod, Onboarding) sont inclus dans l'export
5. En version free, ces settings sont ignorés à l'import (non applicables) mais **conservés dans le JSON**
6. Si l'utilisateur repasse en premium → réimport → tous les settings premium sont restaurés

#### Free → Premium (nouvelle souscription)

1. Utilisateur a un `guardian-export-*.json` de son instance free
2. Dans le setup wizard premium, option "Importer une configuration existante"
3. Import complet — les settings premium (s'ils existaient dans l'export) sont réappliqués
4. Les settings premium absents de l'export → configurés via le setup wizard normalement

#### Compatibilité de l'export

L'export est **versionné** (`schema_version` inclus) pour gérer les migrations entre versions :
```json
{
  "export_version": 1,
  "guardian_version": "0.23.x",
  "guild_id": "123456789",
  "exported_at": "2026-07-08T...",
  "schema_version": 8,
  "data": { ... }
}
```

---

### Table `licenses` (à créer sur Hetzner)

```sql
CREATE TABLE licenses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id            TEXT UNIQUE,
  stripe_customer_id  TEXT,
  stripe_sub_id       TEXT,
  plan                TEXT NOT NULL DEFAULT 'premium',
  active              INTEGER NOT NULL DEFAULT 1,
  activated_at        TEXT,
  expires_at          TEXT,
  grace_until         TEXT,
  invite_token        TEXT,
  token_used          INTEGER NOT NULL DEFAULT 0,
  token_expires_at    TEXT,
  created_at          TEXT NOT NULL
);
```

---

### Composants à développer (dans l'ordre)

1. **Table `licenses`** + migration BDD
2. **`getLicense(guildId)`** dans le bot — check BDD + bypass OWNER_GUILD_ID
3. **Feature flags** dans le code (`if (license.active) { ... }`) sur les features premium
4. **API Express** sur Hetzner : `/invite`, `/callback`, `/webhook/stripe`
5. **Export automatique** à l'expiration + envoi DM owner
6. **Import** dans le setup wizard (free et premium)
7. **Site web** + intégration Stripe

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
