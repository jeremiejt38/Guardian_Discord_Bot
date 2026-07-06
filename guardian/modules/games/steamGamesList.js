const path = require('path');
const GAMES_LIST = require(path.join(__dirname, '../../data/steamGames.json'));

const GENERIC_CHANNEL_NAMES = new Set([
  'general', 'general-vocal', 'general-text', 'annonces', 'announcements',
  'news', 'info', 'infos', 'help', 'aide', 'bot', 'bots', 'log', 'logs',
  'media', 'medias', 'memes', 'off-topic', 'offtopic', 'blabla', 'discussion',
  'bienvenue', 'welcome', 'rules', 'regles', 'faq', 'support', 'tickets',
  'suggestions', 'staff', 'admin', 'moderation', 'mod', 'recrutement',
  'recruitment', 'partenariat', 'partnership', 'archive', 'archives',
  'presentation', 'introductions', 'sondages', 'polls', 'giveaways',
  'stream', 'clips', 'screenshots', 'fan-art', 'artwork', 'musique', 'music',
  'vocal', 'voice', 'lobby', 'waiting', 'afk', 'setup',
]);

function normalize(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Returns the best matching game from the top list for a given channel base name.
 * Returns null if no good match found.
 * @param {string} channelBaseName
 * @returns {{ name: string, appid: number } | null}
 */
function matchGameFromChannelName(channelBaseName) {
  const input = normalize(channelBaseName);

  if (input.length < 2) return null;
  if (GENERIC_CHANNEL_NAMES.has(channelBaseName.toLowerCase())) return null;
  if (GENERIC_CHANNEL_NAMES.has(input)) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const game of GAMES_LIST) {
    if (!game.name) continue;
    const gameName = normalize(game.name);
    if (!gameName) continue;

    let score = 0;

    if (gameName === input) {
      score = 100;
    } else if (gameName.startsWith(input) || input.startsWith(gameName)) {
      score = 80 + (input.length / Math.max(gameName.length, input.length)) * 20;
    } else if (gameName.includes(input) || input.includes(gameName)) {
      score = 50 + (Math.min(input.length, gameName.length) / Math.max(input.length, gameName.length)) * 30;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = game;
    }
  }

  return bestScore >= 50 ? bestMatch : null;
}

/**
 * Search games by name (for autocomplete in setup step 6).
 * Returns top matches sorted by relevance.
 * @param {string} query
 * @param {number} [limit=10]
 * @returns {{ name: string, appid: number }[]}
 */
function searchGames(query, limit = 10) {
  if (!query || query.length < 2) return GAMES_LIST.slice(0, limit);
  const q = normalize(query);

  return GAMES_LIST
    .map((game) => {
      const n = normalize(game.name);
      let score = 0;
      if (n === q) score = 100;
      else if (n.startsWith(q)) score = 80;
      else if (n.includes(q)) score = 60;
      else if (q.includes(n) && n.length >= 3) score = 40;
      return { game, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ game }) => game);
}

module.exports = { matchGameFromChannelName, searchGames, GAMES_LIST };
