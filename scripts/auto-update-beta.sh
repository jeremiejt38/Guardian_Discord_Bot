#!/bin/bash
# Auto-update Guardian from the beta branch
# This script is intended to be run via cron on the beta/premium Hetzner server.
set -euo pipefail

REPO_DIR="/opt/guardian"
GUARDIAN_DIR="${REPO_DIR}/guardian"
BRANCH="beta"
LOG_FILE="/var/log/guardian/auto-update-beta.log"

mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date -Iseconds)] Starting auto-update check..." >> "$LOG_FILE"

cd "$REPO_DIR"
git fetch origin "$BRANCH"

LOCAL=$(git rev-parse "$BRANCH")
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[$(date -Iseconds)] Already up-to-date ($LOCAL)." >> "$LOG_FILE"
  exit 0
fi

echo "[$(date -Iseconds)] New beta commit detected: $REMOTE (local was $LOCAL)." >> "$LOG_FILE"

git reset --hard "origin/$BRANCH"
cd "$GUARDIAN_DIR"
npm ci --omit=dev

# Restart via PM2
if pm2 pid guardian > /dev/null 2>&1; then
  pm2 restart ecosystem.config.js
  echo "[$(date -Iseconds)] Bot restarted via PM2." >> "$LOG_FILE"
else
  pm2 start ecosystem.config.js
  echo "[$(date -Iseconds)] Bot started via PM2." >> "$LOG_FILE"
fi

echo "[$(date -Iseconds)] Auto-update completed." >> "$LOG_FILE"
