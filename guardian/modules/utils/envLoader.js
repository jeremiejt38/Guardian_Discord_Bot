'use strict';

/**
 * Charge le fichier .env correspondant à l'environnement cible.
 * Usage : node index.js --env=dev|beta|prod
 * Par défaut : prod (charge .env à la racine du repo).
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

function resolveEnvFile(args = process.argv.slice(2)) {
  const envArg = args.find((a) => a.startsWith('--env='));
  const envName = envArg ? envArg.slice('--env='.length) : 'prod';

  const allowed = new Set(['dev', 'beta', 'prod']);
  if (!allowed.has(envName)) {
    throw new Error(`Unknown environment: ${envName}. Use --env=dev|beta|prod`);
  }

  const fileName = envName === 'prod' ? '.env' : `.env.${envName}`;
  return { envName, fileName, filePath: path.join(repoRoot, fileName) };
}

function loadEnv(args) {
  const { envName, fileName, filePath } = resolveEnvFile(args);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Environment file not found: ${fileName} (${filePath}). Create it from .env.example.`);
  }

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, '');
    }
  }

  process.env.NODE_ENV = process.env.NODE_ENV || (envName === 'prod' ? 'production' : envName);
  process.env.GUARDIAN_ENV = envName;

  return envName;
}

module.exports = { loadEnv, resolveEnvFile };
