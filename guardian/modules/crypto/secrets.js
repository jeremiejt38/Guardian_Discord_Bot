const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const KEY_ENV = 'SERVER_SECRETS_KEY';

function getKey() {
  const key = process.env[KEY_ENV];
  if (!key) {
    throw new Error(`${KEY_ENV} is not set`);
  }
  // accept raw 32-byte or base64
  if (key.length === 32) return Buffer.from(key);
  return Buffer.from(key, 'base64');
}

function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(payload) {
  if (!payload) return null;
  const data = Buffer.from(payload, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
