#!/bin/bash
# Auto-update Guardian from the configured UPDATE_BRANCH
set -e

APP_DIR="/opt/guardian"
GUARDIAN_DIR="$APP_DIR/guardian"
LOG_FILE="/var/log/guardian/auto-update.log"

mkdir -p "$(dirname "$LOG_FILE")"
exec >> "$LOG_FILE" 2>&1

echo "[$(date -Iseconds)] Starting auto-update check..."

cd "$APP_DIR"

# Load env to get UPDATE_BRANCH if set
UPDATE_BRANCH="$(grep -E '^UPDATE_BRANCH=' "$GUARDIAN_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' || echo 'main')"

# Fetch latest changes from origin
git fetch origin "$UPDATE_BRANCH"

# Check if local branch is behind
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$UPDATE_BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[$(date -Iseconds)] Already up to date on $UPDATE_BRANCH"
  exit 0
fi

echo "[$(date -Iseconds)] Update available: $LOCAL -> $REMOTE"

# Pull latest changes
git reset --hard "origin/$UPDATE_BRANCH"

# Install dependencies
cd "$GUARDIAN_DIR"
npm ci --omit=dev

# Restart via PM2
pm2 restart ecosystem.config.js --update-env

echo "[$(date -Iseconds)] Update applied and bot restarted"
