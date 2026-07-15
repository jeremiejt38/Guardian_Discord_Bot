---
description: Release workflows overview for Guardian (tagging + free release)
---

# `/release` — Guardian release workflows

The release process is split into two workflows:

- **`/tag`** — bump version, update README changelog for minor/major, create and push an annotated git tag. Run after any stable commit/merge on `dev`, `beta`, or `main`.
- **`/release-free`** — build and publish the free public release from `main` to the `Guardian_Discord_Bot_Free` repository.

## Branch strategy

```
feature/xxx  → développement d'une feature (créée depuis dev, mergée dans dev)
dev          → intégration continue (local + serveur test Discord vide)
beta         → early access premium (serveur Discord perso)
main         → stable premium pour abonnés payants (Hetzner)
Guardian_Discord_Bot_Free  → public free build published from main
```

## Flow

1. Develop on `feature/xxx`, merge into `dev`.
2. Test on the empty Discord test server from `dev`.
3. Merge `dev → beta` and test on your personal Discord server.
4. Tag the beta version with `/tag patch|minor|major`.
5. When stable, merge `beta → main`.
6. Tag the stable premium version with `/tag patch|minor|major`.
7. Deploy `main` to the Hetzner premium server.
8. When you want to publish the free version, run `/release-free` from `main`.

## Tagging rules

- `patch` — small fixes and tweaks; does **not** update the README changelog.
- `minor` — new features; creates a `vX.Y` section in the README changelog summarizing all `vX.Y.Z` patches since the last minor.
- `major` — breaking changes; creates a dedicated section.

See `/tag` and `/release-free` for detailed commands and scripts.
