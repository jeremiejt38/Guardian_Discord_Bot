#!/bin/bash
set -e

cd /opt/guardian
git fetch origin
git reset --hard origin/main

cd guardian
npm ci --omit=dev
node deploy-commands.js

if pm2 describe guardian >/dev/null 2>&1; then
  pm2 restart guardian
else
  pm2 start npm --name guardian -- run start
fi

pm2 save
