const test = require('node:test');
const assert = require('node:assert/strict');
const { ChannelType } = require('discord.js');

const {
  findChannelByName,
  findTextChannelByName,
  findCategoryByName,
  findGuildTextChannelByName,
  findGuildVoiceChannelByName,
  findGuildForumChannelByName,
  resolveTextChannel
} = require('../modules/utils/channels');

function textChannel(name, extra = {}) {
  return { name, type: ChannelType.GuildText, isTextBased: () => true, ...extra };
}

function makeGuild(channels, fetch) {
  // A plain array exposes `.find`, matching the Collection API the utils use.
  return { channels: { cache: channels, fetch } };
}

test('findChannelByName / findTextChannelByName respect name and text predicate', () => {
  const voice = { name: 'general', type: ChannelType.GuildVoice, isTextBased: () => false };
  const text = textChannel('general');
  const guild = makeGuild([voice, text]);

  assert.equal(findChannelByName(guild, 'general'), voice); // first match, no text filter
  assert.equal(findTextChannelByName(guild, 'general'), text); // text-only filter
  assert.equal(findTextChannelByName(guild, 'missing'), null);
});

test('findCategory / findGuildText / findGuildVoice filter by type (and parent)', () => {
  const category = { name: 'Games', type: ChannelType.GuildCategory };
  const textA = { name: 'chat', type: ChannelType.GuildText, parentId: 'cat1' };
  const textB = { name: 'chat', type: ChannelType.GuildText, parentId: 'cat2' };
  const voice = { name: 'talk', type: ChannelType.GuildVoice, parentId: 'cat1' };
  const guild = makeGuild([category, textA, textB, voice]);

  assert.equal(findCategoryByName(guild, 'Games'), category);
  assert.equal(findCategoryByName(guild, 'chat'), null);

  // No parent constraint returns first matching name.
  assert.equal(findGuildTextChannelByName(guild, 'chat'), textA);
  // Parent constraint narrows the match.
  assert.equal(findGuildTextChannelByName(guild, 'chat', 'cat2'), textB);
  assert.equal(findGuildTextChannelByName(guild, 'chat', 'nope'), null);

  assert.equal(findGuildVoiceChannelByName(guild, 'talk', 'cat1'), voice);
  assert.equal(findGuildVoiceChannelByName(guild, 'talk', 'cat2'), null);
});

test('findGuildForumChannelByName filters by forum type and parent', () => {
  const forumA = { name: 'faq', type: ChannelType.GuildForum, parentId: 'cat1' };
  const forumB = { name: 'faq', type: ChannelType.GuildForum, parentId: 'cat2' };
  const text = { name: 'faq', type: ChannelType.GuildText, parentId: 'cat1' };
  const guild = makeGuild([text, forumA, forumB]);

  assert.equal(findGuildForumChannelByName(guild, 'faq'), forumA);
  assert.equal(findGuildForumChannelByName(guild, 'faq', 'cat2'), forumB);
  assert.equal(findGuildForumChannelByName(guild, 'faq', 'nope'), null);
  assert.equal(findGuildForumChannelByName(guild, 'missing'), null);
});

test('utils tolerate a guild with no channel cache', () => {
  assert.equal(findChannelByName(undefined, 'x'), null);
  assert.equal(findChannelByName({}, 'x'), null);
  assert.equal(findCategoryByName({ channels: {} }, 'x'), null);
});

test('resolveTextChannel returns the fetched channel when the id is a text channel', async () => {
  const fetched = textChannel('logs');
  let fellBack = false;
  const guild = makeGuild([], async (id) => (id === 'good' ? fetched : null));

  const result = await resolveTextChannel(guild, 'good', 'fallback-name', () => {
    fellBack = true;
  });

  assert.equal(result, fetched);
  assert.equal(fellBack, false);
});

test('resolveTextChannel falls back to name lookup and fires onFallback when id fails', async () => {
  const byName = textChannel('fallback-name');
  let fellBack = false;
  const guild = makeGuild([byName], async () => null);

  const result = await resolveTextChannel(guild, 'stale-id', 'fallback-name', () => {
    fellBack = true;
  });

  assert.equal(result, byName);
  assert.equal(fellBack, true);
});

test('resolveTextChannel returns null when no id and no fallback name', async () => {
  const guild = makeGuild([textChannel('anything')], async () => null);
  assert.equal(await resolveTextChannel(guild, null, null), null);
});
