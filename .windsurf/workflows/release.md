---
description: Release a new version of Guardian (bump version, generate changelog, push tag, create GitHub release)
---

## Prerequisites
- Working tree must be clean (all changes committed)
- `GITHUB_TOKEN` must be set in `.env` at the repo root

## Steps

1. Run the tests to make sure nothing is broken
```bash
cd /home/jerem/workspaces/Guardian_Discord_Bot/guardian && npm test
```

2. Run the release script with the desired bump type (`patch`, `minor`, `major`, or explicit version like `0.24.0`)
```bash
cd /home/jerem/workspaces/Guardian_Discord_Bot && node scripts/release.js patch
```

The script will:
- Bump the version in `guardian/package.json`
- Generate a categorized changelog from git commits since the last tag
- Commit the version bump
- Create and push a git tag
- Create a GitHub release with the changelog notes

## After release
- The GitHub release will appear at https://github.com/jeremiejt38/Guardian_Discord_Bot/releases
- When the bot restarts on a server, it will fetch the changelog from GitHub and send it to the bot admin
- Guild owners will receive a DM listing new configurable options introduced in this version
