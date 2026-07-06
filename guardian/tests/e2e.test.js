/**
 * Tests d'intégration end-to-end (E2E)
 * Simule des flows complets sans bot Discord réel :
 *   - Flow 1 : Setup complet step 1 → step 8 → finalisation
 *   - Flow 2 : Ajout jeu → pagination → suppression
 *   - Flow 3 : Onboarding membre (invite → demande promo → validation)
 *   - Flow 4 : Modération (warn → mute → ban → historique)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { initDatabase } = require('../database/db');
const { getGuildSetting, setGuildSetting } = require('../modules/config/settings');
const { handleSetupInteraction } = require('../modules/initialisation/setupFlow');
const { setGradeRole } = require('../modules/initialisation/gradeMapping');
const { listSetupGames, addSetupGame, removeSetupGameById } = require('../modules/initialisation/setupGames');
const { saveSanction, getSanctionsHistory } = require('../modules/moderation/moderation');
const { isGuildInstalled } = require('../modules/initialisation/checkInstall');
const { getNotifPrefs, setNotifPref } = require('../modules/notifications/dmNotifier');

// ─── Helpers ────────────────────────────────────────────────────────────────

let guildIndex = 100;

function newGuildId() { return `e2e-guild-${guildIndex++}`; }

function buildRole({ id, name, position = 1, managed = false }) {
  return { id, name, position, managed, members: { size: 0 } };
}

function buildRolesCache(roles = []) {
  return {
    filter: (fn) => buildRolesCache(roles.filter(fn)),
    sort: (fn) => { roles.sort(fn); return buildRolesCache(roles); },
    first: (n) => roles.slice(0, n ?? 1),
    get: (id) => roles.find((r) => r.id === id),
    some: (fn) => roles.some(fn),
    everyone: { id: 'everyone' }
  };
}

function buildGuild({ id, community = true, roles = [] } = {}) {
  const guildId = id ?? newGuildId();
  const roleList = roles.length ? roles : [];
  return {
    id: guildId,
    ownerId: 'owner-user',
    name: 'E2E Test Guild',
    features: community ? ['COMMUNITY'] : [],
    roles: { cache: buildRolesCache(roleList), everyone: { id: 'everyone' } },
    channels: { cache: new Map() },
    members: {
      cache: {
        size: 0,
        filter: () => {
          const empty = [];
          empty.size = 0;
          empty.forEach = () => {};
          empty.values = () => [][Symbol.iterator]();
          empty[Symbol.iterator] = () => [][Symbol.iterator]();
          return empty;
        },
        find: () => undefined,
        forEach: () => {},
        values: () => [][Symbol.iterator](),
        [Symbol.iterator]: () => [][Symbol.iterator]()
      },
      fetch: async () => {
        const empty = [];
        empty.size = 0;
        empty.filter = () => empty;
        empty.forEach = () => {};
        empty.values = () => [][Symbol.iterator]();
        empty[Symbol.iterator] = () => [][Symbol.iterator]();
        return empty;
      }
    },
    memberCount: 5,
    verificationLevel: 1,
    rulesChannelId: 'rules-ch',
    publicUpdatesChannelId: 'updates-ch',
    fetchOwner: async () => ({ id: 'owner-user', user: { tag: 'Owner#0001' } })
  };
}

function buildInteraction({ customId, guild, userId = 'owner-user', values = [], stringSelect = false, modalSubmit = false, fields = {}, replied = false, deferred = false }) {
  const state = { replied: null, updated: null, messageEdited: null, modalShown: null };
  return {
    customId,
    guildId: guild.id,
    guild,
    user: { id: userId },
    values,
    replied,
    deferred,
    memberPermissions: { has: () => true },
    isButton: () => !stringSelect && !modalSubmit,
    isStringSelectMenu: () => stringSelect,
    isModalSubmit: () => modalSubmit,
    isRepliable: () => true,
    fields: {
      getTextInputValue: (key) => fields[key] ?? '',
      getField: (key) => fields[key] !== undefined
        ? { values: Array.isArray(fields[key]) ? fields[key] : [] }
        : { values: [] }
    },
    channel: { send: async () => {}, messages: { fetch: async () => new Map() } },
    message: { edit: async (p) => { state.messageEdited = p; return p; } },
    reply: async (p) => { state.replied = p; return p; },
    update: async (p) => { state.updated = p; return p; },
    deferReply: async () => {},
    deferUpdate: async () => {},
    editReply: async (p) => { state.updated = p; return p; },
    followUp: async (p) => { state.replied = p; return p; },
    showModal: async (m) => { state.modalShown = m; return m; },
    deleteReply: async () => {},
    client: { user: { id: 'bot-id' } },
    get _replied() { return state.replied; },
    get _updated() { return state.updated; },
    get _messageEdited() { return state.messageEdited; },
    get _modalShown() { return state.modalShown; }
  };
}

function makeRoles(guildId) {
  const roles = [
    buildRole({ id: `${guildId}-invite`, name: 'Invite', position: 1 }),
    buildRole({ id: `${guildId}-membre`, name: 'Membre', position: 2 }),
    buildRole({ id: `${guildId}-moderateur`, name: 'Moderateur', position: 3 }),
    buildRole({ id: `${guildId}-manager`, name: 'Manager', position: 4 }),
    buildRole({ id: `${guildId}-owner`, name: 'Owner', position: 5 })
  ];
  return roles;
}

function mapAllGrades(guildId) {
  setGradeRole(guildId, 'invite',     `${guildId}-invite`);
  setGradeRole(guildId, 'membre',     `${guildId}-membre`);
  setGradeRole(guildId, 'moderateur', `${guildId}-moderateur`);
  setGradeRole(guildId, 'manager',    `${guildId}-manager`);
  setGradeRole(guildId, 'owner',      `${guildId}-owner`);
}

// ─── Flow 1 : Setup — transitions d'étapes critiques ──────────────────────────

test('E2E Flow 1 — setup wizard : skip game detect → step 3, puis step 3→4 avec #général', async () => {
  initDatabase(':memory:');
  const guildId = newGuildId();
  const guild = buildGuild({ id: guildId });
  mapAllGrades(guildId);

  // Simuler qu'on est à step 2, skip game detect → step 3
  setGuildSetting(guildId, 'setup', 'step', 2);
  const skipDetect = buildInteraction({ customId: 'setup:gamedetect:skip', guild });
  await handleSetupInteraction(skipDetect);
  assert.strictEqual(getGuildSetting(guildId, 'setup', 'step'), 3, 'Doit être à step 3 après skip detect');

  // Configurer #général + avancer tous les slots → step 4
  setGuildSetting(guildId, 'channels', 'general_channel_id', 'general-ch-id');
  const TOTAL_SLOTS = 9;
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    setGuildSetting(guildId, 'setup', 'channel_cursor', i);
    const nav = buildInteraction({ customId: 'setup:channel:skip:next', guild });
    await handleSetupInteraction(nav);
  }
  assert.strictEqual(getGuildSetting(guildId, 'setup', 'step'), 4, 'Doit être à step 4 après les channels');

  // Steps 4 → 5 → 6 → 7 → 8 via next direct (pas de validation Discord)
  for (let step = 4; step <= 7; step++) {
    setGuildSetting(guildId, 'setup', 'step', step);
    const nav = buildInteraction({ customId: 'setup:step:next', guild });
    await handleSetupInteraction(nav);
    assert.strictEqual(getGuildSetting(guildId, 'setup', 'step'), step + 1, `Doit être à step ${step + 1}`);
  }
  assert.strictEqual(getGuildSetting(guildId, 'setup', 'step'), 8, 'Doit terminer à step 8');
});

// ─── Flow 1b : Finalisation bloquée si étapes manquantes ─────────────────────

test('E2E Flow 1b — finalisation bloquée si step < 8', async () => {
  initDatabase(':memory:');
  const guildId = newGuildId();
  const guild = buildGuild({ id: guildId });
  setGuildSetting(guildId, 'setup', 'step', 5);

  const finalize = buildInteraction({ customId: 'setup:finalize', guild });
  await handleSetupInteraction(finalize);
  assert.ok(!isGuildInstalled(guildId), 'Ne doit pas marquer installé si step < 8');
});

// ─── Flow 1c : Step 3 bloqué sans #général ───────────────────────────────────

test('E2E Flow 1c — step 3 bloqué si #général non configuré', async () => {
  initDatabase(':memory:');
  const guildId = newGuildId();
  const roles = makeRoles(guildId);
  const guild = buildGuild({ id: guildId, roles });
  mapAllGrades(guildId);
  setGuildSetting(guildId, 'setup', 'step', 3);

  // Curseur sur le dernier slot (simuler fin de liste)
  const TOTAL_SLOTS = 9;
  setGuildSetting(guildId, 'setup', 'channel_cursor', TOTAL_SLOTS - 1);

  // PAS de general_channel_id configuré → doit bloquer
  const nav = buildInteraction({ customId: 'setup:channel:skip:next', guild });
  await handleSetupInteraction(nav);
  assert.strictEqual(getGuildSetting(guildId, 'setup', 'step'), 3, 'Doit rester à step 3 sans #général');
});

// ─── Flow 2 : Jeux — ajout, pagination, suppression ─────────────────────────

test('E2E Flow 2 — ajout jeu, pagination step 6, suppression', async () => {
  initDatabase(':memory:');
  const guildId = newGuildId();

  // Ajouter 5 jeux
  const names = ['Counter-Strike 2', 'Dota 2', 'Minecraft', 'Rust', 'Fortnite'];
  for (const name of names) {
    addSetupGame(guildId, { name });
  }

  const games = listSetupGames(guildId);
  assert.strictEqual(games.length, 5, 'Doit avoir 5 jeux');

  // Simuler navigation page suivante step 6
  const guild = buildGuild({ id: guildId });
  setGuildSetting(guildId, 'setup', 'step', 6);
  setGuildSetting(guildId, 'setup', 'games_page', 0);

  const pageNext = buildInteraction({ customId: 'setup:games:page:next', guild });
  await handleSetupInteraction(pageNext);
  assert.strictEqual(getGuildSetting(guildId, 'setup', 'games_page'), 1, 'Doit passer à la page 1');

  const pagePrev = buildInteraction({ customId: 'setup:games:page:prev', guild });
  await handleSetupInteraction(pagePrev);
  assert.strictEqual(getGuildSetting(guildId, 'setup', 'games_page'), 0, 'Doit revenir à la page 0');

  // Supprimer un jeu
  const gameId = games[0].game_id;
  removeSetupGameById(guildId, gameId);
  const afterRemove = listSetupGames(guildId);
  assert.strictEqual(afterRemove.length, 4, 'Doit avoir 4 jeux après suppression');
  assert.ok(!afterRemove.find((g) => g.game_id === gameId), 'Le jeu supprimé ne doit plus être présent');
});

// ─── Flow 3 : Onboarding membre (ajout → demande promo → approbation) ────────

test('E2E Flow 3 — onboarding membre : invite → demande promo → approbation DB', async () => {
  initDatabase(':memory:');
  const guildId = newGuildId();
  const userId = 'user-promo-001';
  const reviewerId = 'reviewer-001';
  const { getDb } = require('../database/db');
  const db = getDb();
  const now = new Date().toISOString();

  // Insérer un membre invite
  db.prepare(
    `INSERT OR IGNORE INTO members (guild_id, user_id, grade, join_date, score_comportement) VALUES (?, ?, ?, ?, ?)`
  ).run(guildId, userId, 'invite', now, 0);

  const member = db.prepare('SELECT * FROM members WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  assert.ok(member, 'Le membre doit exister en DB');
  assert.strictEqual(member.grade, 'invite', 'Doit être invite au départ');

  // Créer une demande de promotion
  db.prepare(
    `INSERT INTO promotion_requests (guild_id, user_id, status, created_at) VALUES (?, ?, 'pending', ?)`
  ).run(guildId, userId, now);
  const req = db.prepare('SELECT * FROM promotion_requests WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  assert.ok(req, 'La demande doit exister');
  assert.strictEqual(req.status, 'pending');

  // Approuver : mettre à jour statut + grade membre
  db.prepare(`UPDATE promotion_requests SET status = 'accepted', reviewed_by = ?, reviewed_at = ? WHERE request_id = ?`)
    .run(reviewerId, now, req.request_id);
  db.prepare(`UPDATE members SET grade = 'membre' WHERE guild_id = ? AND user_id = ?`)
    .run(guildId, userId);

  const promoted = db.prepare('SELECT * FROM members WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  assert.strictEqual(promoted.grade, 'membre', 'Doit être membre après approbation');

  const approved = db.prepare('SELECT * FROM promotion_requests WHERE request_id = ?').get(req.request_id);
  assert.strictEqual(approved.status, 'accepted');
  assert.strictEqual(approved.reviewed_by, reviewerId);
});

// ─── Flow 4 : Modération (warn → mute → ban → historique) ───────────────────

test('E2E Flow 4 — modération : warn → mute → ban → historique', async () => {
  initDatabase(':memory:');
  const guildId = newGuildId();
  const targetId = 'user-mod-001';
  const modId = 'moderator-001';

  // Insérer directement le membre
  const { getDb } = require('../database/db');
  const db2 = getDb();
  db2.prepare(
    `INSERT OR IGNORE INTO members (guild_id, user_id, grade, join_date, score_comportement) VALUES (?, ?, ?, ?, ?)`
  ).run(guildId, targetId, 'membre', new Date().toISOString(), 50);

  // Warn
  saveSanction({ guildId, userId: targetId, type: 'warn', reason: 'Spam', appliedBy: modId, auto: 0 });
  // Mute
  saveSanction({ guildId, userId: targetId, type: 'mute', reason: 'Insultes', appliedBy: modId, auto: 0, duration: '1h' });
  // Ban
  saveSanction({ guildId, userId: targetId, type: 'ban', reason: 'Récidive', appliedBy: modId, auto: 0 });

  const history = getSanctionsHistory(guildId, targetId);
  assert.strictEqual(history.length, 3, 'Doit avoir 3 sanctions');

  const types = history.map((s) => s.type);
  assert.ok(types.includes('warn'), 'Doit contenir un warn');
  assert.ok(types.includes('mute'), 'Doit contenir un mute');
  assert.ok(types.includes('ban'), 'Doit contenir un ban');

  // Vérifier les raisons
  const ban = history.find((s) => s.type === 'ban');
  assert.strictEqual(ban.reason, 'Récidive');
  assert.strictEqual(ban.applied_by, modId);
});

// ─── Flow 5 : Migration DB versionnée ─────────────────────────────────────────

test('E2E Flow 5 — migrations DB idempotentes (rejouer ne duplique pas)', async () => {
  const { migrateDatabase } = require('../database/db');
  initDatabase(':memory:');

  // Rejouer deux fois les migrations → ne doit pas planter ni dupliquer
  migrateDatabase();
  migrateDatabase();

  // Vérifier que schema_version a bien des entrées uniques
  const { getDb } = require('../database/db');
  const db = getDb();
  const versions = db.prepare('SELECT version FROM schema_version').all();
  const unique = new Set(versions.map((r) => r.version));
  assert.strictEqual(versions.length, unique.size, 'Chaque version doit être unique dans schema_version');
});

// ─── Flow 6 : Notifications DM — préférences par guilde ─────────────────────

test('E2E Flow 6 — préférences notifications DM stockées et récupérées', async () => {
  initDatabase(':memory:');
  const guildId = newGuildId();

  // Par défaut tout désactivé sauf critiques
  const defaults = getNotifPrefs(guildId);
  assert.ok(defaults !== null && typeof defaults === 'object', 'Doit retourner un objet de préférences');
  assert.ok('bot_update' in defaults, 'Doit avoir la clé bot_update');

  // Activer une catégorie
  setNotifPref(guildId, 'bot_update', true);
  const updated = getNotifPrefs(guildId);
  assert.strictEqual(updated.bot_update, true, 'bot_update doit être activé');

  // Désactiver
  setNotifPref(guildId, 'bot_update', false);
  const disabled = getNotifPrefs(guildId);
  assert.strictEqual(disabled.bot_update, false, 'bot_update doit être désactivé');
});
