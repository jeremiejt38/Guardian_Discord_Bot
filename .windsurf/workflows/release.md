---
description: Release a new version of Guardian (bump version, generate changelog, update README, push tag, create GitHub release)
---

## Prerequisites
- Working tree must be clean (all changes committed and pushed)
- `GITHUB_TOKEN` must be set in `guardian/.env`
  - Generate at: https://github.com/settings/tokens → Fine-grained → repo Contents: write + Metadata: read

## Steps

1. Run the tests to make sure nothing is broken
```bash
cd /home/jerem/workspaces/Guardian_Discord_Bot/guardian && npm test
```

2. Run the release script with the desired bump type (`patch`, `minor`, `major`, or explicit version like `0.24.0`)
```bash
cd /home/jerem/workspaces/Guardian_Discord_Bot && node scripts/release.js patch
```

The script does the following automatically:
- Bumps the version in `guardian/package.json`
- Updates the version badge in `README.md`
- Inserts a new entry in the `## Changelog` table of `README.md` (summary of commits + diff link)
- Generates a categorized changelog from git commits since the last tag (feat / fix / refactor / perf / docs / chore)
- Commits `package.json` + `README.md` together
- Creates and pushes an annotated git tag
- Creates a GitHub release with the full categorized changelog notes

## README — source de vérité

**Toutes les sections du README sont générées depuis `scripts/readme-data.js`.**

Le README généré contient dans cet ordre :
1. Header + badges (version auto-lue depuis `guardian/package.json`)
2. ✨ Features (`FEATURES`)
3. 🚀 Getting started — prérequis, installation, variables d'env (`ENV_REQUIRED`, `ENV_OPTIONAL`), librairies (`LIBRARIES`)
4. Changelog (`CHANGELOG`)
5. ✅ Roadmap v1.0.0 (`ROADMAP_V1` — blocking / important / nice-to-have)
6. 🚀 Post-v1.0.0 Roadmap (`ROADMAP_POST_V1`)
7. Contributing + footer

> La section "Structure du projet" et "Tests" ont été supprimées du README.

Pour modifier n'importe quelle section :
1. Éditer `scripts/readme-data.js`
2. Regénérer :

```bash
# Aperçu local sans push
node scripts/generate-readme.js --dry

# Générer + commit + push sur main
node scripts/generate-readme.js
```

### Exemples courants dans readme-data.js

**Ajouter une feature dans le tableau Features :**
```js
{ emoji: '🆕', module: 'Nouveau module', desc: 'Description du module' },
```

**Ajouter une entrée changelog :**
```js
{
  version: 'v0.24',
  title: 'Titre de la version',
  desc: 'Description des changements',
  links: [{ label: 'Full diff', url: 'https://github.com/.../compare/v0.23.5...v0.24.0' }],
},
```

**Ajouter un item roadmap pre-v1 :**
```js
{ done: false, label: 'Nom de la feature', desc: 'Description' },
```

**Cocher un item roadmap pre-v1 comme livré :**
```js
{ done: true, label: 'Nom de la feature', desc: 'Description', doneVersion: 'v0.24.0' },
```

**Ajouter une feature dans une section post-v1 :**
```js
// Dans ROADMAP_POST_V1, trouver la bonne section et ajouter dans features:
{ label: 'Nom', desc: 'Description' },
```

## After release
- The GitHub release appears at https://github.com/jeremiejt38/Guardian_Discord_Bot/releases
- On next bot startup after an update, the bot admin receives a single DM with:
  - The changelog range (all versions between old and new, fetched from GitHub)
  - A "Apply update" button
- Guild owners receive a DM listing new configurable options introduced in this version (setup step indicated), sent once per version update
