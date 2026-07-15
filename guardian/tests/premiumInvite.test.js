const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPremiumInviteURL, getPremiumClientId } = require('../modules/tier/premiumInvite');

test('getPremiumClientId prefers PREMIUM_CLIENT_ID over CLIENT_ID', () => {
  process.env.PREMIUM_CLIENT_ID = 'premium-id';
  process.env.CLIENT_ID = 'fallback-id';
  assert.equal(getPremiumClientId(), 'premium-id');
  delete process.env.PREMIUM_CLIENT_ID;
  assert.equal(getPremiumClientId(), 'fallback-id');
});

test('buildPremiumInviteURL returns null without client id', () => {
  delete process.env.PREMIUM_CLIENT_ID;
  delete process.env.CLIENT_ID;
  assert.equal(buildPremiumInviteURL(), null);
});

test('buildPremiumInviteURL builds an oauth2 url with guild_id', () => {
  process.env.CLIENT_ID = '123456789';
  const url = buildPremiumInviteURL('987654321');
  assert.ok(url.startsWith('https://discord.com/oauth2/authorize?'));
  assert.ok(url.includes('client_id=123456789'));
  assert.ok(url.includes('guild_id=987654321'));
  assert.ok(url.includes('scope=bot+applications.commands'));
});
