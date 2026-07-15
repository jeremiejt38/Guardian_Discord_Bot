#!/usr/bin/env node
'use strict';

/**
 * License API for Guardian Premium
 * Minimal HTTP API to create/activate/check licenses.
 * Intended to be called by a future payment website/webhook.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

// Load Guardian .env manually so DATABASE_PATH is configured
const envPath = path.join(__dirname, '..', '..', 'guardian', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^['"](.*)['"]$/s, '$1');
    }
  }
}

const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'guardian', 'data', 'guardian.db');
process.env.DATABASE_PATH = DATABASE_PATH;

const { initDatabase, migrateDatabase } = require('../../guardian/database/db');
initDatabase();
migrateDatabase();

const {
  createLicense,
  linkLicenseToGuild,
  revokeLicense,
  isLicenseValidForGuild,
  getLicenseForGuild,
} = require('../../guardian/modules/tier/licenses');
const { buildPremiumInviteURL } = require('../../guardian/modules/tier/premiumInvite');

const PORT = process.env.LICENSE_API_PORT || 7799;
const TOKEN = process.env.LICENSE_API_TOKEN;

if (!TOKEN) {
  console.error('LICENSE_API_TOKEN is required');
  process.exit(1);
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function isAuthorized(req) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  return parts[0] === 'Bearer' && parts[1] === TOKEN;
}

function requireAuth(req, res) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === '/health' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true });
    }

    if (url.pathname === '/licenses' && req.method === 'POST') {
      if (!requireAuth(req, res)) return;
      const body = await readBody(req);
      const days = body.days ? Number(body.days) : null;
      const { key, expiresAt } = createLicense(days);
      if (body.guild_id) {
        linkLicenseToGuild(key, body.guild_id);
      }
      return sendJson(res, 201, {
        license_key: key,
        guild_id: body.guild_id || null,
        expires_at: expiresAt || null,
      });
    }

    if (url.pathname === '/licenses/activate' && req.method === 'POST') {
      if (!requireAuth(req, res)) return;
      const body = await readBody(req);
      if (!body.license_key || !body.guild_id) {
        return sendJson(res, 400, { error: 'license_key and guild_id required' });
      }
      linkLicenseToGuild(body.license_key, body.guild_id);
      return sendJson(res, 200, { ok: true, guild_id: body.guild_id });
    }

    const guildMatch = url.pathname.match(/^\/licenses\/([^/]+)$/);
    if (guildMatch && req.method === 'GET') {
      if (!requireAuth(req, res)) return;
      const guildId = guildMatch[1];
      const valid = isLicenseValidForGuild(guildId);
      const license = getLicenseForGuild(guildId);
      return sendJson(res, 200, {
        guild_id: guildId,
        valid,
        license: license
          ? {
              license_key: license.license_key,
              created_at: license.created_at,
              expires_at: license.expires_at || null,
              active: Boolean(license.active),
            }
          : null,
      });
    }

    if (url.pathname === '/licenses/revoke' && req.method === 'POST') {
      if (!requireAuth(req, res)) return;
      const body = await readBody(req);
      if (!body.license_key) {
        return sendJson(res, 400, { error: 'license_key required' });
      }
      const ok = revokeLicense(body.license_key);
      return sendJson(res, 200, { ok });
    }

    if (url.pathname === '/invite-url' && req.method === 'GET') {
      const guildId = url.searchParams.get('guild_id') || null;
      const inviteUrl = buildPremiumInviteURL(guildId);
      if (!inviteUrl) {
        return sendJson(res, 500, { error: 'PREMIUM_CLIENT_ID or CLIENT_ID not configured' });
      }
      return sendJson(res, 200, {
        invite_url: inviteUrl,
        guild_id: guildId,
        permissions: 'administrator'
      });
    }

    if (url.pathname === '/webhooks/payment' && req.method === 'POST') {
      const body = await readBody(req);
      if (body.secret !== TOKEN) {
        return sendJson(res, 401, { error: 'Unauthorized' });
      }
      if (!body.guild_id || !body.days) {
        return sendJson(res, 400, { error: 'guild_id and days required' });
      }
      const { key, expiresAt } = createLicense(Number(body.days));
      linkLicenseToGuild(key, body.guild_id);
      return sendJson(res, 201, {
        license_key: key,
        guild_id: body.guild_id,
        expires_at: expiresAt || null,
      });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('License API error:', err.message);
    return sendJson(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`License API listening on port ${PORT}`);
});
