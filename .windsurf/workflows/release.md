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

## After release
- The GitHub release appears at https://github.com/jeremiejt38/Guardian_Discord_Bot/releases
- On next bot startup after an update, the bot admin receives a single DM with:
  - The changelog range (all versions between old and new, fetched from GitHub)
  - A "Apply update" button
- Guild owners receive a DM listing new configurable options introduced in this version (setup step indicated), sent once per version update
