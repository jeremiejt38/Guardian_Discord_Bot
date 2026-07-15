#!/usr/bin/env node
/**
 * Guardian free public release script
 *
 * Build and publish the free bundle from main to the Guardian_Discord_Bot_Free repository.
 *
 * Requirements:
 *   - Run only from main branch
 *   - Clean working tree
 *   - A matching tag must exist for the current package.json version
 *   - GITHUB_TOKEN and GITHUB_FREE_RELEASE_TOKEN env vars (or in .env)
 */

const fs = require('fs');
const path = require('path');

const {
  REPO_ROOT,
  PKG_PATH,
  GITHUB_REPO,
  GITHUB_FREE_REPO,
  run,
  loadEnv,
  getLastTag,
  getCommitsSince,
  categorizeCommits,
  createGithubRelease,
  buildFreeZip,
  publishFreeRelease,
} = require('./release-helpers');

loadEnv();

const FREE_BUILD_SCRIPT = path.resolve(REPO_ROOT, 'scripts/build-free.js');
const FREE_OUT_DIR = path.resolve(REPO_ROOT, 'dist/guardian-free');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_FREE_TOKEN = process.env.GITHUB_FREE_RELEASE_TOKEN;

async function main() {
  const currentBranch = run('git rev-parse --abbrev-ref HEAD', { silent: true });
  if (currentBranch !== 'main') {
    console.error(`❌ release-free must be run from 'main' branch (current: '${currentBranch}').`);
    process.exit(1);
  }

  const dirty = run('git status --porcelain', { silent: true });
  if (dirty) {
    console.error('❌ Working tree is dirty. Commit or stash changes first.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const version = pkg.version;
  const tag = `v${version}`;
  const lastTag = getLastTag();

  if (!lastTag || lastTag !== tag) {
    console.error(`❌ No matching tag for current version ${tag}. Run: node scripts/tag.js first.`);
    process.exit(1);
  }

  console.log(`\n📦 Guardian Free release: ${tag}\n`);

  const rawLog = getCommitsSince(lastTag);
  const changelog = categorizeCommits(rawLog);

  const releaseBody = [
    `## Guardian Free ${tag}`,
    '',
    '> Version auto-hébergée — sans les features Premium.',
    '',
    changelog || '*No changes documented.*',
    '',
    `**Diff complet** : https://github.com/${GITHUB_REPO}/compare/${lastTag ?? 'HEAD'}...${tag}`,
    '',
    '### Installation',
    '1. Télécharge le `.zip` ci-dessous',
    '2. Décompresse et configure ton `.env` (voir `.env.example`)',
    '3. `npm install && npm start`'
  ].join('\n');

  if (GITHUB_TOKEN) {
    console.log('📡 Creating premium GitHub release...');
    await createGithubRelease(GITHUB_REPO, GITHUB_TOKEN, tag, releaseBody, pkg.prerelease ?? false);
  } else {
    console.warn('⚠️  GITHUB_TOKEN not set — skipping premium GitHub release.');
  }

  console.log('\n🔨 Building free bundle...');
  fs.rmSync(FREE_OUT_DIR, { recursive: true, force: true });
  run(`node "${FREE_BUILD_SCRIPT}" --out "${FREE_OUT_DIR}"`);

  if (!GITHUB_FREE_TOKEN) {
    console.warn('\n⚠️  GITHUB_FREE_RELEASE_TOKEN absent — étape free ignorée.');
    console.warn('   Définis GITHUB_FREE_RELEASE_TOKEN dans .env pour activer la publication free.\n');
    return;
  }

  console.log('\n🚀 Publishing free release...');
  const zipPath = buildFreeZip(version, FREE_OUT_DIR);
  await publishFreeRelease(tag, releaseBody, zipPath, lastTag, pkg.prerelease ?? false);

  console.log(`\n🎉 Free release ${tag} complete!\n`);
}

main().catch((err) => {
  console.error('❌ Free release failed:', err.message);
  process.exit(1);
});
