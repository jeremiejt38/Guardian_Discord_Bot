#!/usr/bin/env node
/**
 * Guardian release script
 *
 * Usage:
 *   node scripts/release.js patch    # 0.23.5 → 0.23.6
 *   node scripts/release.js minor    # 0.23.5 → 0.24.0
 *   node scripts/release.js major    # 0.23.5 → 1.0.0
 *   node scripts/release.js 0.24.1   # explicit version
 *
 * Requirements:
 *   - GITHUB_TOKEN env var (or in .env at repo root)
 *   - git configured with push access
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Load .env from repo root ────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'jeremiejt38/Guardian_Discord_Bot';
const PKG_PATH = path.resolve(__dirname, '../guardian/package.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts }).trim();
}

function bumpVersion(current, bump) {
  const [major, minor, patch] = current.split('.').map(Number);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;
  throw new Error(`Invalid bump type: ${bump}. Use major | minor | patch | x.y.z`);
}

function getCommitsSince(tag) {
  try {
    return run(`git log ${tag}..HEAD --pretty=format:"%s" --no-merges`, { silent: true });
  } catch {
    return run(`git log --pretty=format:"%s" --no-merges -50`, { silent: true });
  }
}

function getLastTag() {
  try {
    return run('git describe --tags --abbrev=0', { silent: true });
  } catch {
    return null;
  }
}

function categorizeCommits(rawLog) {
  const lines = rawLog.split('\n').map((l) => l.trim()).filter(Boolean);

  const categories = {
    feat:     { label: '✨ New features', items: [] },
    fix:      { label: '🐛 Bug fixes', items: [] },
    refactor: { label: '♻️ Refactoring', items: [] },
    perf:     { label: '⚡ Performance', items: [] },
    docs:     { label: '📝 Documentation', items: [] },
    chore:    { label: '🔧 Chores', items: [] },
    other:    { label: '📦 Other', items: [] }
  };

  for (const line of lines) {
    const m = line.match(/^(feat|fix|refactor|perf|docs|chore|test|style|build|ci)(\(.+?\))?!?:\s*(.+)$/i);
    if (m) {
      const type = m[1].toLowerCase();
      const scope = m[2] ? m[2].slice(1, -1) : null;
      const msg = m[3];
      const display = scope ? `**${scope}**: ${msg}` : msg;
      const cat = categories[type] ?? categories.other;
      cat.items.push(display);
    } else {
      categories.other.items.push(line);
    }
  }

  const sections = [];
  for (const cat of Object.values(categories)) {
    if (cat.items.length === 0) continue;
    sections.push(`### ${cat.label}`);
    for (const item of cat.items) sections.push(`- ${item}`);
    sections.push('');
  }

  return sections.join('\n').trim();
}

async function createGithubRelease(tag, body, prerelease = false) {
  if (!GITHUB_TOKEN) {
    console.warn('⚠️  GITHUB_TOKEN not set — skipping GitHub release creation.');
    console.warn('   Set GITHUB_TOKEN in your .env file to enable automatic releases.');
    return null;
  }

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Guardian-Discord-Bot',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tag_name: tag,
      name: tag,
      body,
      draft: false,
      prerelease
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
  return await res.json();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const bumpArg = process.argv[2] ?? 'patch';

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const oldVersion = pkg.version;
  const newVersion = bumpVersion(oldVersion, bumpArg);
  const newTag = `v${newVersion}`;

  console.log(`\n🚀 Guardian release: v${oldVersion} → ${newTag}\n`);

  // 1. Check working tree is clean
  const dirty = run('git status --porcelain', { silent: true });
  if (dirty) {
    console.error('❌ Working tree is dirty. Commit or stash changes first.');
    process.exit(1);
  }

  // 2. Check tag doesn't already exist
  const existingTags = run('git tag', { silent: true }).split('\n');
  if (existingTags.includes(newTag)) {
    console.error(`❌ Tag ${newTag} already exists.`);
    process.exit(1);
  }

  // 3. Generate changelog
  const lastTag = getLastTag();
  console.log(`📋 Generating changelog since ${lastTag ?? 'beginning'}...`);
  const rawLog = getCommitsSince(lastTag);
  const changelog = categorizeCommits(rawLog);

  if (!changelog) {
    console.warn('⚠️  No commits found since last tag.');
  }

  const releaseBody = [
    `## What's new in ${newTag}`,
    '',
    changelog || '*No changes documented.*',
    '',
    `**Full diff**: https://github.com/${GITHUB_REPO}/compare/${lastTag ?? 'HEAD'}...${newTag}`
  ].join('\n');

  console.log('\n── Release notes preview ──────────────────────────────');
  console.log(releaseBody);
  console.log('────────────────────────────────────────────────────────\n');

  // 4. Bump version in package.json
  pkg.version = newVersion;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ package.json updated → ${newVersion}`);

  // 5. Commit + tag + push
  run('git add guardian/package.json');
  run(`git commit -m "chore: bump version to ${newVersion}"`);
  run(`git tag -a ${newTag} HEAD -m "release ${newTag}"`);
  console.log(`✅ Committed and tagged ${newTag}`);

  run('git push origin main --tags');
  console.log('✅ Pushed to origin');

  // 6. Create GitHub release
  console.log('📡 Creating GitHub release...');
  const release = await createGithubRelease(newTag, releaseBody, pkg.prerelease ?? false);
  if (release) {
    console.log(`✅ GitHub release created: ${release.html_url}`);
  }

  console.log(`\n🎉 Release ${newTag} complete!\n`);
}

main().catch((err) => {
  console.error('❌ Release failed:', err.message);
  process.exit(1);
});
