# Guardian_Discord_Bot
Discord bot for gaming communities — manages game opt-in channels,  temporary voice channels, member onboarding and server moderation.

## Project structure

The bot source code lives in `guardian/`.

## Quick start

1. Copy `guardian/.env.example` to `guardian/.env` and fill values.
2. `cd guardian`
3. Install dependencies: `npm install`
4. Run tests: `npm test`
5. Start bot: `npm start`

## Lando (test environment)

This repository includes `.lando.yml` for a dedicated Node 22 test environment.

### Prerequisites

1. Install Docker.
2. Install Lando.
3. Start Docker before using Lando.

### Initialize Lando

1. Start services: `lando start`
2. Install locked dependencies in container: `lando install`
3. Run the test suite: `lando test`

### Useful Lando commands

- `lando ci` runs a clean dependency install with lockfile.
- `lando test-watch` runs tests in watch mode.
- `lando start-bot` starts the bot in the container.
- `lando deploy-commands` deploys slash commands.
- `lando shell` opens a shell in the app service.

### Notes

- Lando forces a test-safe environment (`NODE_ENV=test`) with fake tokens.
- Lando uses an isolated SQLite path (`/tmp/guardian-test.db`) to avoid writing to your local runtime database.

### Quick troubleshooting

- If startup fails after dependency changes, run `lando rebuild -y`.
- If Docker is not running, start Docker and rerun `lando start`.
