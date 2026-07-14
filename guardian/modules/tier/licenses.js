'use strict';

/**
 * licenses.js
 * Gestion des clés de licence Guardian Premium.
 * Permet de créer des clés, les lier à une guilde, et vérifier leur validité.
 */

const { getDb } = require('../../database/db');

const LICENSE_KEY_LENGTH = 24;

function generateLicenseKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < LICENSE_KEY_LENGTH; i++) {
    if (i > 0 && i % 6 === 0) key += '-';
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function createLicense(days = null) {
  const db = getDb();
  const key = generateLicenseKey();
  const expiresAt = days ? Date.now() + days * 24 * 60 * 60 * 1000 : null;
  db.prepare(
    'INSERT INTO guild_licenses (license_key, expires_at, active) VALUES (?, ?, 1)'
  ).run(key, expiresAt ?? null);
  return { key, expiresAt };
}

function linkLicenseToGuild(licenseKey, guildId) {
  const db = getDb();
  const normalized = licenseKey.replace(/\s/g, '').toUpperCase();
  const row = db.prepare('SELECT license_key, guild_id, active, expires_at FROM guild_licenses WHERE license_key = ?').get(normalized);
  if (!row) throw new Error('Clé de licence introuvable.');
  if (!row.active) throw new Error('Clé de licence désactivée.');
  if (row.expires_at && row.expires_at < Date.now()) throw new Error('Clé de licence expirée.');
  if (row.guild_id && row.guild_id !== guildId) throw new Error('Clé déjà utilisée sur une autre guilde.');
  db.prepare('UPDATE guild_licenses SET guild_id = ? WHERE license_key = ?').run(guildId, normalized);
  return true;
}

function unlinkLicenseFromGuild(guildId) {
  const db = getDb();
  const row = db.prepare('SELECT license_key FROM guild_licenses WHERE guild_id = ?').get(guildId);
  if (!row) return false;
  db.prepare('UPDATE guild_licenses SET guild_id = NULL WHERE license_key = ?').run(row.license_key);
  return true;
}

function revokeLicense(licenseKey) {
  const db = getDb();
  const normalized = licenseKey.replace(/\s/g, '').toUpperCase();
  const res = db.prepare('UPDATE guild_licenses SET active = 0 WHERE license_key = ?').run(normalized);
  return res.changes > 0;
}

function isLicenseValidForGuild(guildId) {
  const db = getDb();
  try {
    const row = db.prepare(
      'SELECT active, expires_at FROM guild_licenses WHERE guild_id = ? AND active = 1'
    ).get(guildId);
    if (!row) return false;
    if (row.expires_at && row.expires_at < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

function getLicenseForGuild(guildId) {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM guild_licenses WHERE guild_id = ?').get(guildId) || null;
  } catch {
    return null;
  }
}

module.exports = {
  generateLicenseKey,
  createLicense,
  linkLicenseToGuild,
  unlinkLicenseFromGuild,
  revokeLicense,
  isLicenseValidForGuild,
  getLicenseForGuild,
};
