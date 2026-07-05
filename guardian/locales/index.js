const { getGuildSetting } = require('../modules/config/settings');
const frJs = require('./fr');
const frJson = require('./fr.json');
const enJson = require('./en.json');

function deepMerge(base, override) {
  const result = Object.assign({}, base);
  for (const key of Object.keys(override)) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])
        && base[key] && typeof base[key] === 'object') {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

const locales = Object.freeze({
  fr: deepMerge(frJs, frJson),
  en: enJson
});

function getByPath(object, path) {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), object);
}

function interpolate(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] !== undefined ? String(vars[key]) : `{${key}}`));
}

function resolveGuildLanguage(guildId) {
  if (!guildId) {
    return 'fr';
  }

  return getGuildSetting(guildId, 'bot', 'language', 'fr');
}

function t(path, vars = {}, options = {}) {
  const lang = options.lang || resolveGuildLanguage(options.guildId);
  const dictionary = locales[lang] || locales.fr;
  const value = getByPath(dictionary, path);

  if (typeof value === 'string') {
    return interpolate(value, vars);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => interpolate(entry, vars));
  }

  return path;
}

module.exports = {
  t,
  resolveGuildLanguage
};
