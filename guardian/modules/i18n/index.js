const fs = require('fs');
const path = require('path');
const { getConfig, setConfig } = require('../../database/db');

const LOCALES_DIR = path.resolve(__dirname, '../../locales');
const DEFAULT_LANGUAGE = 'en';

let cache = null;

function deepGet(object, dottedPath) {
  return String(dottedPath || '')
    .split('.')
    .reduce((acc, key) => (acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined), object);
}

function interpolate(template, variables = {}) {
  if (typeof template !== 'string') {
    return template;
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => {
    const value = variables[name];
    return value === undefined || value === null ? '' : String(value);
  });
}

function loadLocales() {
  const locales = {};

  if (!fs.existsSync(LOCALES_DIR)) {
    return locales;
  }

  for (const fileName of fs.readdirSync(LOCALES_DIR)) {
    if (!fileName.endsWith('.json')) {
      continue;
    }

    const language = path.basename(fileName, '.json');
    const filePath = path.join(LOCALES_DIR, fileName);

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      locales[language] = parsed;
    } catch {
      // Ignore malformed locale files; they simply won't be offered.
    }
  }

  return locales;
}

function getLocales() {
  if (!cache) {
    cache = loadLocales();
  }

  return cache;
}

function normalizeLanguage(language) {
  const locales = getLocales();
  if (language && locales[language]) {
    return language;
  }

  if (locales[DEFAULT_LANGUAGE]) {
    return DEFAULT_LANGUAGE;
  }

  const first = Object.keys(locales)[0];
  return first || DEFAULT_LANGUAGE;
}

function getAvailableLanguages() {
  return Object.keys(getLocales()).sort();
}

function getLanguageLabel(language) {
  const locale = getLocales()[language] || {};
  const nativeName = deepGet(locale, 'meta.nativeName');
  return nativeName || language;
}

function getGuildLanguage(guildId) {
  if (!guildId) {
    return normalizeLanguage(DEFAULT_LANGUAGE);
  }

  try {
    const current = getConfig(guildId, 'i18n', 'language', null);
    if (current) {
      return normalizeLanguage(current);
    }

    const legacy = getConfig(guildId, 'initialisation', 'language', null);
    if (legacy) {
      return normalizeLanguage(legacy);
    }
  } catch {
    return normalizeLanguage(DEFAULT_LANGUAGE);
  }

  return normalizeLanguage(DEFAULT_LANGUAGE);
}

function setGuildLanguage(guildId, language) {
  const locales = getLocales();
  if (!language || !locales[language]) return getGuildLanguage(guildId);
  setConfig(guildId, 'i18n', 'language', language);
  return language;
}

const DISCORD_LOCALE_MAP = {
  'fr':    'fr',
  'en-US': 'en',
  'en-GB': 'en',
  'de':    'de',
  'es-ES': 'es',
  'es-419':'es',
  'pt-BR': 'pt',
  'nl':    'nl',
  'it':    'it',
  'pl':    'pl',
  'ro':    'ro',
  'sv-SE': 'sv',
  'da':    'da',
  'fi':    'fi',
  'nb':    'nb',
  'tr':    'tr',
  'cs':    'cs',
  'hr':    'hr',
  'bg':    'bg',
  'ru':    'ru',
  'uk':    'uk',
  'hi':    'hi',
  'th':    'th',
  'zh-CN': 'zh',
  'zh-TW': 'zh',
  'ja':    'ja',
  'ko':    'ko',
  'vi':    'vi',
  'id':    'id',
};

/**
 * Maps a Discord locale string to a supported Guardian language code.
 * Falls back to DEFAULT_LANGUAGE if not supported.
 * @param {string} discordLocale
 * @returns {string}
 */
function detectLanguageFromLocale(discordLocale) {
  if (!discordLocale) return 'en';
  const available = getAvailableLanguages();
  const mapped = DISCORD_LOCALE_MAP[discordLocale] ?? discordLocale.split('-')[0];
  return available.includes(mapped) ? mapped : 'en';
}

function tForLanguage(language, key, variables = {}) {
  const locales = getLocales();
  const currentLanguage = normalizeLanguage(language);
  const fallbackLanguage = normalizeLanguage(DEFAULT_LANGUAGE);

  const current = deepGet(locales[currentLanguage], key);
  if (typeof current === 'string') {
    return interpolate(current, variables);
  }

  const fallback = deepGet(locales[fallbackLanguage], key);
  if (typeof fallback === 'string') {
    return interpolate(fallback, variables);
  }

  return key;
}

function t(guildId, key, variables = {}) {
  return tForLanguage(getGuildLanguage(guildId), key, variables);
}

function describe(key) {
  return tForLanguage(DEFAULT_LANGUAGE, key);
}

module.exports = {
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  getLanguageLabel,
  getGuildLanguage,
  setGuildLanguage,
  detectLanguageFromLocale,
  t,
  tForLanguage,
  describe
};
