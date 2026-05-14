const fs = require('fs');
const path = require('path');

const skillsBaseDir = path.join(process.cwd(), 'gm-starter/skills');

function parseSkillMarkdown(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  let frontmatterEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      frontmatterEnd = i;
      break;
    }
  }

  if (frontmatterEnd === -1) {
    return { name: '', description: '', allowedTools: [], compatible: [], endToEnd: false, raw: content };
  }

  const frontmatter = lines.slice(1, frontmatterEnd).join('\n');
  const prose = lines.slice(frontmatterEnd + 1).join('\n');

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+?)(?=\n[a-z-]+:|$)/ms);
  const toolsMatch = frontmatter.match(/^allowed-tools:\s*([\s\S]*?)(?=\n[a-z-]+:|$)/m);
  const compatMatch = frontmatter.match(/^compatible-platforms:\s*([\s\S]*?)(?=\n[a-z-]+:|$)/m);
  const e2eMatch = frontmatter.match(/^end-to-end:\s*(.+)$/m);

  const parseList = (str) => {
    if (!str) return [];
    return str.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim());
  };

  return {
    name: nameMatch ? nameMatch[1].trim() : '',
    description: descMatch ? descMatch[1].trim() : '',
    allowedTools: parseList(toolsMatch ? toolsMatch[1] : ''),
    compatiblePlatforms: parseList(compatMatch ? compatMatch[1] : ''),
    endToEnd: e2eMatch ? e2eMatch[1].trim() === 'true' : false,
    raw: content
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

const allSkills = getAllSkills();
console.log('[manifest-impl] Found skills:', Object.keys(allSkills).sort().join(', '));

const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];
console.log('\n[manifest-impl] Core skills verification:');

for (const skillName of coreSkills) {
  const skill = getManifest(skillName);
  if (!skill) {
    console.log(`  ✗ ${skillName}: NOT FOUND`);
    continue;
  }

  const hasName = !!skill.name;
  const hasDesc = skill.description && skill.description.length > 10;
  const hasTools = skill.allowedTools && skill.allowedTools.length > 0;

  console.log(`  ✓ ${skillName}:`);
  console.log(`    - name: "${skill.name}" ${hasName ? '✓' : '✗'}`);
  console.log(`    - desc: "${skill.description.substring(0, 60)}..." ${hasDesc ? '✓' : '✗'}`);
  console.log(`    - tools: [${skill.allowedTools.join(', ')}] ${hasTools ? '✓' : '✗'}`);
}

const module_code = `
const fs = require('fs');
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

console.log('\n[manifest-impl] Writing gm-skill/lib/manifest.js...');
const libDir = path.join(process.cwd(), 'gm-skill', 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}
fs.writeFileSync(path.join(libDir, 'manifest.js'), module_code);
console.log('[manifest-impl] ✓ manifest.js created');

console.log('\n[manifest-impl] Verifying manifest.js exports...');
const manifest = require(path.join(libDir, 'manifest.js'));
const exports = ['parseSkillMarkdown', 'getAllSkills', 'getManifest', 'getSkill'];
for (const exp of exports) {
  console.log(`  ${typeof manifest[exp] === 'function' ? '✓' : '✗'} ${exp}`);
}

console.log('\n[manifest-impl] COMPLETE - manifest.js created and verified');
