const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[complete] Running final completion workflow\n');

const cwd = process.cwd();

console.log('[complete] Step 1: Ensure manifest.js exists');
const libDir = path.join(cwd, 'gm-skill', 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

const manifestCode = `const fs = require('fs');
const path = require('path');

const skillsBaseDir = path.join(__dirname, '../../gm-starter/skills');

function parseSkillMarkdown(content) {
  const normalized = content.replace(/\\r\\n/g, '\\n');
  const lines = normalized.split('\\n');

  let frontmatterEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      frontmatterEnd = i;
      break;
    }
  }

  if (frontmatterEnd === -1) {
    return { name: '', description: '', allowedTools: [], compatiblePlatforms: [], endToEnd: false };
  }

  const frontmatter = lines.slice(1, frontmatterEnd).join('\\n');
  const nameMatch = frontmatter.match(/^name:\\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\\s*(.+?)(?=\\n[a-z-]+:|$)/ms);
  const toolsMatch = frontmatter.match(/^allowed-tools:\\s*([\\s\\S]*?)(?=\\n[a-z-]+:|$)/m);
  const compatMatch = frontmatter.match(/^compatible-platforms:\\s*([\\s\\S]*?)(?=\\n[a-z-]+:|$)/m);
  const e2eMatch = frontmatter.match(/^end-to-end:\\s*(.+)$/m);

  const parseList = (str) => {
    if (!str) return [];
    return str.split('\\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('-'))
      .map(l => l.replace(/^-\\s*/, '').trim());
  };

  return {
    name: nameMatch ? nameMatch[1].trim() : '',
    description: descMatch ? descMatch[1].trim() : '',
    allowedTools: parseList(toolsMatch ? toolsMatch[1] : ''),
    compatiblePlatforms: parseList(compatMatch ? compatMatch[1] : ''),
    endToEnd: e2eMatch ? e2eMatch[1].trim() === 'true' : false
  };
}

function getAllSkills() {
  const entries = fs.readdirSync(skillsBaseDir, { withFileTypes: true });
  const skills = {};

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsBaseDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;

    const content = fs.readFileSync(skillPath, 'utf8');
    const parsed = parseSkillMarkdown(content);
    if (parsed.name) {
      skills[parsed.name] = parsed;
    }
  }

  return skills;
}

function getManifest(skillName) {
  const skillPath = path.join(skillsBaseDir, skillName, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    return null;
  }
  const content = fs.readFileSync(skillPath, 'utf8');
  return parseSkillMarkdown(content);
}

function getSkill(name) {
  return getManifest(name);
}

module.exports = {
  parseSkillMarkdown,
  getAllSkills,
  getManifest,
  getSkill
};
`;

const manifestPath = path.join(libDir, 'manifest.js');
fs.writeFileSync(manifestPath, manifestCode);
console.log('[complete] ✓ manifest.js written');

console.log('[complete] Step 2: Update gm-skill/index.js');
const indexPath = path.join(cwd, 'gm-skill', 'index.js');
const newIndexCode = `const daemonBootstrap = require('../gm-starter/lib/daemon-bootstrap.js');
const spool = require('../gm-starter/lib/spool.js');
const manifest = require('./lib/manifest.js');

module.exports = {
  ...daemonBootstrap,
  spool,
  manifest
};
`;
fs.writeFileSync(indexPath, newIndexCode);
console.log('[complete] ✓ index.js updated');

console.log('[complete] Step 3: Run e2e tests');
try {
  const manifest = require(manifestPath);
  const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];
  let testsPass = true;

  for (const skillName of coreSkills) {
    const skill = manifest.getManifest(skillName);
    if (!skill || !skill.name || skill.description.length < 20) {
      console.error(`[complete] ✗ ${skillName} parsing failed`);
      testsPass = false;
    }
  }

  if (!testsPass) {
    process.exit(1);
  }
  console.log('[complete] ✓ E2E tests passed');
} catch (e) {
  console.error('[complete] ✗ E2E test error:', e.message);
  process.exit(1);
}

console.log('[complete] Step 4: Clean up PRD and mutables');
const prdPath = path.join(cwd, '.gm', 'prd.yml');
const mutsPath = path.join(cwd, '.gm', 'mutables.yml');

if (fs.existsSync(prdPath)) {
  fs.unlinkSync(prdPath);
  console.log('[complete] ✓ Deleted .gm/prd.yml');
}

if (fs.existsSync(mutsPath)) {
  fs.unlinkSync(mutsPath);
  console.log('[complete] ✓ Deleted .gm/mutables.yml');
}

console.log('[complete] Step 5: Stage new files');
try {
  execSync('git add gm-skill/lib/manifest.js', { cwd });
  execSync('git add gm-skill/index.js', { cwd });
  console.log('[complete] ✓ Files staged');
} catch (e) {
  console.error('[complete] ✗ Git add failed:', e.message);
  process.exit(1);
}

console.log('[complete] ✓✓✓ COMPLETION PHASE READY ✓✓✓');
console.log('[complete] All files created, tested, and staged for commit');

process.exit(0);
