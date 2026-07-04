const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

test('secrets module encrypts and decrypts text round-trip', () => {
  const key = crypto.randomBytes(32);
  process.env.SERVER_SECRETS_KEY = key.toString('base64');

  // Clear module cache to pick up the new env
  const modulePath = require.resolve('../modules/crypto/secrets');
  delete require.cache[modulePath];
  const { encrypt, decrypt } = require('../modules/crypto/secrets');

  const plaintext = 'my-secret-password-123!@#';
  const ciphertext = encrypt(plaintext);
  assert.notEqual(ciphertext, plaintext);
  assert.equal(decrypt(ciphertext), plaintext);

  const empty = encrypt('');
  assert.equal(decrypt(empty), '');

  const unicode = encrypt('mot de passe: àéîöü 🔑');
  assert.equal(decrypt(unicode), 'mot de passe: àéîöü 🔑');

  assert.equal(decrypt(null), null);

  const ct1 = encrypt('same');
  const ct2 = encrypt('same');
  assert.notEqual(ct1, ct2);
});

test('secrets module throws when key is not set', () => {
  delete process.env.SERVER_SECRETS_KEY;

  const modulePath = require.resolve('../modules/crypto/secrets');
  delete require.cache[modulePath];
  const { encrypt } = require('../modules/crypto/secrets');

  assert.throws(() => encrypt('test'), { message: /SERVER_SECRETS_KEY/ });
});

test('secrets module accepts raw 32-byte key', () => {
  // The module checks key.length === 32, which only holds for ASCII-safe bytes.
  // Generate a 32-char ASCII string to simulate a raw key.
  const rawKey = 'abcdefghijklmnopqrstuvwxyz012345';
  assert.equal(rawKey.length, 32);
  process.env.SERVER_SECRETS_KEY = rawKey;

  const modulePath = require.resolve('../modules/crypto/secrets');
  delete require.cache[modulePath];
  const { encrypt, decrypt } = require('../modules/crypto/secrets');

  const ct = encrypt('hello');
  assert.equal(decrypt(ct), 'hello');
});
