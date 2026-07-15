---
description: Tag a new version of Guardian after any commit on dev/beta/main
---

# `/tag` — Create a version tag

Create an annotated git tag and bump `guardian/package.json` after a commit/merge on any branch.
This workflow does **not** publish the free build nor create a GitHub release.
Use `/release-free` for the public free release from `main`.

## Branch strategy

```
feature/xxx  → développement d'une feature (créée depuis dev, mergée dans dev)
dev          → intégration continue (local + serveur test Discord vide)
beta         → early access premium (serveur Discord perso)
main         → stable premium pour abonnés payants (Hetzner)
```

**Rules:**
- Never work directly on `dev`, `beta`, or `main`.
- Use `/tag` after a feature is merged and tested.
- Tags are immutable: if a tag already exists for the computed version, bump again.

## Usage

```bash
cd /home/jerem/workspaces/Guardian_Discord_Bot
node scripts/tag.js <bump>
```

`bump` can be:
- `patch` — bug fixes, small tweaks
- `minor` — new features grouped under a minor version (README changelog updated)
- `major` — breaking changes
- an explicit version, e.g. `0.25.0`

## What the script does

1. Check the current branch (`dev`, `beta`, or `main`).
2. Read current version from `guardian/package.json`.
3. Bump it according to the argument.
4. Update `guardian/package.json`.
5. Generate or update README changelog **only for minor/major bumps**.
   - For a minor bump, create a new `vX.Y` section summarizing all `vX.Y.Z` patches since the last minor.
6. Commit `chore(release): bump vX.Y.Z`.
7. Create an annotated git tag `vX.Y.Z` with the changelog summary as message.
8. Push the commit and the tag to `origin`.

## Example

```bash
# After a hotfix on beta
node scripts/tag.js patch

# After a new feature cycle ready for main
node scripts/tag.js minor
```

## Notes

- Patch tags do **not** touch the README changelog.
- Minor/major tags aggregate patch notes since the previous minor/major.
- The version badge in `README.md` is updated for every bump.
