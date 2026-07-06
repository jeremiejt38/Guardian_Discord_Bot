const { getGuildSetting } = require('../modules/config/settings');
const frJson = require('./fr.json');
const enJson = require('./en.json');

const locales = Object.freeze({
  fr: frJson,
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
