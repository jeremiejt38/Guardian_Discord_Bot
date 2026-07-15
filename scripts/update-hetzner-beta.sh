#!/bin/bash
set -e

cd /opt/guardian-beta
git fetch origin
git pull origin beta --ff-only

cd guardian
npm ci --omit=dev
node deploy-commands.js --env=beta

if pm2 describe guardian-beta >/dev/null 2>&1; then
  pm2 restart guardian-beta
else
  pm2 start npm --name guardian-beta -- run start:beta
fi

pm2 save
