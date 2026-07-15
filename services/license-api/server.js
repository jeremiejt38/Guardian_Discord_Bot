#!/usr/bin/env node
'use strict';

/**
 * License API for Guardian Premium
 * Minimal HTTP API to create/activate/check licenses, with Stripe integration.
 */

const crypto = require('crypto');
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

const PORT = process.env.LICENSE_API_PORT || 7799;
const TOKEN = process.env.LICENSE_API_TOKEN;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!TOKEN) {
  console.error('LICENSE_API_TOKEN is required');
  process.exit(1);
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req, raw = false) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => { chunks.push(chunk); });
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      if (raw) return resolve(body);
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

async function stripeApi(method, endpoint, body = null) {
  const headers = {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Guardian-License-API/1.0',
  };
  const url = `https://api.stripe.com/v1${endpoint}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Stripe error ${res.status}`);
  }
  return data;
}

function verifyStripeSignature(payload, signature, secret) {
  if (!signature) return false;
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedSig));
  } catch {
    return false;
  }
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

    if (url.pathname === '/stripe/checkout' && req.method === 'POST') {
      if (!requireAuth(req, res)) return;
      if (!STRIPE_SECRET_KEY) {
        return sendJson(res, 503, { error: 'Stripe is not configured' });
      }
      const body = await readBody(req);
      if (!body.guild_id || !body.success_url || !body.cancel_url) {
        return sendJson(res, 400, { error: 'guild_id, success_url and cancel_url required' });
      }
      const days = Number(body.days) || 365;
      const priceId = body.price_id;
      if (!priceId) {
        return sendJson(res, 400, { error: 'price_id required (create a price in Stripe Dashboard)' });
      }
      const session = await stripeApi('POST', '/checkout/sessions', {
        mode: 'payment',
        client_reference_id: body.guild_id,
        'metadata[days]': days.toString(),
        success_url: body.success_url,
        cancel_url: body.cancel_url,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
      });
      return sendJson(res, 201, {
        session_id: session.id,
        url: session.url,
        guild_id: body.guild_id,
      });
    }

    if (url.pathname === '/webhooks/stripe' && req.method === 'POST') {
      if (!STRIPE_WEBHOOK_SECRET) {
        return sendJson(res, 503, { error: 'Stripe webhook secret is not configured' });
      }
      const signature = req.headers['stripe-signature'];
      const payload = await readBody(req, true);
      if (!verifyStripeSignature(payload, signature, STRIPE_WEBHOOK_SECRET)) {
        return sendJson(res, 400, { error: 'Invalid signature' });
      }
      const event = JSON.parse(payload);
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const guildId = session.client_reference_id;
        const days = Number(session.metadata?.days) || 365;
        if (guildId) {
          const { key, expiresAt } = createLicense(days);
          linkLicenseToGuild(key, guildId);
          console.log(`Stripe webhook: license ${key} created for guild ${guildId} (${days} days)`);
          return sendJson(res, 200, {
            ok: true,
            license_key: key,
            guild_id: guildId,
            expires_at: expiresAt || null,
          });
        }
      }
      return sendJson(res, 200, { ok: true, received: true });
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
