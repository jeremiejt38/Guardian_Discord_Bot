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

This repository now includes `/home/runner/work/Guardian_Discord_Bot/Guardian_Discord_Bot/.lando.yml` for a dedicated test environment.

1. Start Lando: `lando start`
2. Install dependencies in the container: `lando install`
3. Run tests in the test environment: `lando test`

Optional commands:
- `lando start-bot` to start the bot in the container
- `lando deploy-commands` to deploy slash commands
