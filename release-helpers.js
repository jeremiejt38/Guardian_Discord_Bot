const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Lit le fichier package.json et retourne l'objet JSON
 * @returns {Object} Le contenu du package.json
 */
function readPackageJson() {
  const packagePath = path.join(__dirname, '..', 'guardian', 'package.json');
  const packageJson = fs.readFileSync(packagePath, 'utf8');
  return JSON.parse(packageJson);
}

/**
 * Écrit le contenu dans le fichier package.json
 * @param {Object} content - Le contenu à écrire
 */
function writePackageJson(content) {
  const packagePath = path.join(__dirname, '..', 'guardian', 'package.json');
  fs.writeFileSync(packagePath, JSON.stringify(content, null, 2));
}

/**
 * Lit le README.md et retourne son contenu
 * @returns {string} Le contenu du README.md
 */
function readReadme() {
  const readmePath = path.join(__dirname, '..', 'README.md');
  return fs.readFileSync(readmePath, 'utf8');
}

/**
 * Écrit le contenu dans le README.md
 * @param {string} content - Le contenu à écrire
 */
function writeReadme(content) {
  const readmePath = path.join(__dirname, '..', 'README.md');
  fs.writeFileSync(readmePath, content);
}

/**
 * Exécute une commande shell et retourne la sortie
 * @param {string} command - La commande à exécuter
 * @returns {string} La sortie de la commande
 */
function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

/**
 * Récupère le dernier tag existant
 * @returns {string} Le dernier tag ou une chaîne vide si aucun tag n'existe
 */
function getLastTag() {
  try {
    const tag = runCommand('git describe --tags --abbrev=0');
    return tag;
  } catch (error) {
    return '';
  }
}

/**
 * Récupère les commits depuis le dernier tag
 * @param {string} lastTag - Le dernier tag
 * @returns {Array} Liste des commits
 */
function getCommitsSinceLastTag(lastTag) {
  const command = lastTag 
    ? `git log --pretty=format:"%h|%s|%b" ${lastTag}..HEAD`
    : 'git log --pretty=format:"%h|%s|%b" --all';
  
  const output = runCommand(command);
  if (!output) return [];
  
  return output.split('\n').map(line => {
    const [hash, subject, body] = line.split('|');
    return { hash, subject, body };
  });
}

/**
 * Catégorise les commits
 * @param {Array} commits - Liste des commits
 * @returns {Object} Commits catégorisés
 */
function categorizeCommits(commits) {
  const categories = {
    'feat': [],
    'fix': [],
    'docs': [],
    'style': [],
    'refactor': [],
    'test': [],
    'chore': [],
    'perf': [],
    'revert': []
  };
  
  commits.forEach(commit => {
    const type = commit.subject.split(':')[0].toLowerCase();
    if (categories[type]) {
      categories[type].push(commit);
    } else {
      categories['chore'].push(commit);
    }
  });
  
  return categories;
}

/**
 * Génère le corps du changelog à partir des commits catégorisés
 * @param {Object} categorizedCommits - Commits catégorisés
 * @returns {string} Corps du changelog
 */
function generateChangelogBody(categorizedCommits) {
  const sections = [];
  
  if (categorizedCommits['feat'] && categorizedCommits['feat'].length > 0) {
    sections.push('### Features\n');
    categorizedCommits['feat'].forEach(commit => {
      sections.push(`- ${commit.subject}`);
    });
    sections.push('');
  }
  
  if (categorizedCommits['fix'] && categorizedCommits['fix'].length > 0) {
    sections.push('### Bug Fixes\n');
    categorizedCommits['fix'].forEach(commit => {
      sections.push(`- ${commit.subject}`);
    });
    sections.push('');
  }
  
  if (categorizedCommits['perf'] && categorizedCommits['perf'].length > 0) {
    sections.push('### Performance Improvements\n');
    categorizedCommits['perf'].forEach(commit => {
      sections.push(`- ${commit.subject}`);
    });
    sections.push('');
  }
  
  if (categorizedCommits['refactor'] && categorizedCommits['refactor'].length > 0) {
    sections.push('### Refactors\n');
    categorizedCommits['refactor'].forEach(commit => {
      sections.push(`- ${commit.subject}`);
    });
    sections.push('');
  }
  
  if (categorizedCommits['docs'] && categorizedCommits['docs'].length > 0) {
    sections.push('### Documentation\n');
    categorizedCommits['docs'].forEach(commit => {
      sections.push(`- ${commit.subject}`);
    });
    sections.push('');
  }
  
  if (categorizedCommits['test'] && categorizedCommits['test'].length > 0) {
    sections.push('### Tests\n');
    categorizedCommits['test'].forEach(commit => {
      sections.push(`- ${commit.subject}`);
    });
    sections.push('');
  }
  
  if (categorizedCommits['style'] && categorizedCommits['style'].length > 0) {
    sections.push('### Styles\n');
    categorizedCommits['style'].forEach(commit => {
      sections.push(`- ${commit.subject}`);
    });
    sections.push('');
  }
  
  if (categorizedCommits['chore'] && categorizedCommits['chore'].length > 0) {
    sections.push('### Chores\n');
    categorizedCommits['chore'].forEach(commit => {
      sections.push(`- ${commit.subject}`);
    });
    sections.push('');
  }
  
  return sections.join('\n');
}

/**
 * Vérifie si on est sur la branche main
 * @returns {boolean} True si on est sur main, false sinon
 */
function isOnMainBranch() {
  try {
    const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD');
    return currentBranch === 'main';
  } catch (error) {
    return false;
  }
}

/**
 * Vérifie si le dépôt est propre (aucun fichier modifié)
 * @returns {boolean} True si propre, false sinon
 */
function isWorkingTreeClean() {
  try {
    const status = runCommand('git status --porcelain');
    return status === '';
  } catch (error) {
    return false;
  }
}

/**
 * Vérifie si un tag existe déjà
 * @param {string} tagName - Le nom du tag à vérifier
 * @returns {boolean} True si le tag existe, false sinon
 */
function tagExists(tagName) {
  try {
    runCommand(`git rev-parse ${tagName}`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Récupère la version actuelle du package.json
 * @returns {string} La version actuelle
 */
function getCurrentVersion() {
  const packageJson = readPackageJson();
  return packageJson.version;
}

module.exports = {
  readPackageJson,
  writePackageJson,
  readReadme,
  writeReadme,
  runCommand,
  getLastTag,
  getCommitsSinceLastTag,
  categorizeCommits,
  generateChangelogBody,
  isOnMainBranch,
  isWorkingTreeClean,
  tagExists,
  getCurrentVersion
};
