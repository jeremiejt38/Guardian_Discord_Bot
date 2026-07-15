#!/usr/bin/env node
'use strict';

/**
 * manage-licenses.js
 * CLI serveur pour gérer les licences Guardian Premium.
 * Usage :
 *   node scripts/manage-licenses.js create [days]
 *   node scripts/manage-licenses.js link <license-key> <guild-id>
 *   node scripts/manage-licenses.js unlink <guild-id>
 *   node scripts/manage-licenses.js revoke <license-key>
 *   node scripts/manage-licenses.js info <guild-id>
 */

const path = require('path');
process.env.DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'guardian', 'data', 'guardian.db');

const { initDatabase, migrateDatabase } = require('../guardian/database/db');
initDatabase();
migrateDatabase();

const {
  createLicense,
  linkLicenseToGuild,
  unlinkLicenseFromGuild,
  revokeLicense,
  getLicenseForGuild,
} = require('../guardian/modules/tier/licenses');

const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
  console.log(`Usage:
  node scripts/manage-licenses.js create [days]              # days = null if omitted
  node scripts/manage-licenses.js link <license-key> <guild-id>
  node scripts/manage-licenses.js unlink <guild-id>
  node scripts/manage-licenses.js revoke <license-key>
  node scripts/manage-licenses.js info <guild-id>`);
}

async function main() {
  switch (command) {
    case 'create': {
      const days = args[1] ? Number(args[1]) : null;
      if (args[1] && Number.isNaN(days)) {
        console.error('Nombre de jours invalide.');
        process.exit(1);
      }
      const { key, expiresAt } = createLicense(days);
      console.log('Licence créée :', key);
      if (expiresAt) console.log('Expire le      :', new Date(expiresAt).toISOString());
      break;
    }
    case 'link': {
      const [key, guildId] = args.slice(1);
      if (!key || !guildId) {
        printUsage();
        process.exit(1);
      }
      linkLicenseToGuild(key, guildId);
      console.log(`Licence ${key} liée à la guilde ${guildId}.`);
      break;
    }
    case 'unlink': {
      const guildId = args[1];
      if (!guildId) {
        printUsage();
        process.exit(1);
      }
      const ok = unlinkLicenseFromGuild(guildId);
      console.log(ok ? `Licence retirée de la guilde ${guildId}.` : `Aucune licence trouvée pour ${guildId}.`);
      break;
    }
    case 'revoke': {
      const key = args[1];
      if (!key) {
        printUsage();
        process.exit(1);
      }
      const ok = revokeLicense(key);
      console.log(ok ? `Licence ${key} révoquée.` : `Licence ${key} introuvable.`);
      break;
    }
    case 'info': {
      const guildId = args[1];
      if (!guildId) {
        printUsage();
        process.exit(1);
      }
      const license = getLicenseForGuild(guildId);
      if (!license) {
        console.log(`Aucune licence pour ${guildId}.`);
      } else {
        console.log(JSON.stringify(license, null, 2));
      }
      break;
    }
    default:
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
