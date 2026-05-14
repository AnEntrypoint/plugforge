const fs = require('fs');
const path = require('path');

console.log('[pre-emit] Verifying proposed manifest.js implementation before write...\n');

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
    return { name: '', description: '', allowedTools: [], compatiblePlatforms: [], endToEnd: false };
  }

  const frontmatter = lines.slice(1, frontmatterEnd).join('\n');
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
    endToEnd: e2eMatch ? e2eMatch[1].trim() === 'true' : false
  };
}

function getAllSkills() {
  const skillsBaseDir = path.join(process.cwd(), 'gm-starter/skills');
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
  const skillPath = path.join(process.cwd(), 'gm-starter/skills', skillName, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    return null;
  }
  const content = fs.readFileSync(skillPath, 'utf8');
  return parseSkillMarkdown(content);
}

console.log('[pre-emit] Test 1: Parse gm/SKILL.md with CRLF normalization');
const gmSkillPath = path.join(process.cwd(), 'gm-starter/skills/gm/SKILL.md');
const gmContent = fs.readFileSync(gmSkillPath, 'utf8');
const gmParsed = parseSkillMarkdown(gmContent);
console.log(`  name: "${gmParsed.name}" ${gmParsed.name === 'gm' ? '✓' : '✗'}`);
console.log(`  description length: ${gmParsed.description.length} ${gmParsed.description.length > 50 ? '✓' : '✗'}`);
console.log(`  allowedTools: [${gmParsed.allowedTools.join(', ')}] ${gmParsed.allowedTools.includes('Skill') ? '✓' : '✗'}`);

console.log('\n[pre-emit] Test 2: Parse gm-execute/SKILL.md');
const execSkillPath = path.join(process.cwd(), 'gm-starter/skills/gm-execute/SKILL.md');
const execContent = fs.readFileSync(execSkillPath, 'utf8');
const execParsed = parseSkillMarkdown(execContent);
console.log(`  name: "${execParsed.name}" ${execParsed.name === 'gm-execute' ? '✓' : '✗'}`);
console.log(`  description length: ${execParsed.description.length} ${execParsed.description.length > 50 ? '✓' : '✗'}`);

console.log('\n[pre-emit] Test 3: Parse gm-emit/SKILL.md');
const emitSkillPath = path.join(process.cwd(), 'gm-starter/skills/gm-emit/SKILL.md');
const emitContent = fs.readFileSync(emitSkillPath, 'utf8');
const emitParsed = parseSkillMarkdown(emitContent);
console.log(`  name: "${emitParsed.name}" ${emitParsed.name === 'gm-emit' ? '✓' : '✗'}`);
console.log(`  description length: ${emitParsed.description.length} ${emitParsed.description.length > 50 ? '✓' : '✗'}`);

console.log('\n[pre-emit] Test 4: Parse gm-complete/SKILL.md');
const completeSkillPath = path.join(process.cwd(), 'gm-starter/skills/gm-complete/SKILL.md');
const completeContent = fs.readFileSync(completeSkillPath, 'utf8');
const completeParsed = parseSkillMarkdown(completeContent);
console.log(`  name: "${completeParsed.name}" ${completeParsed.name === 'gm-complete' ? '✓' : '✗'}`);
console.log(`  description length: ${completeParsed.description.length} ${completeParsed.description.length > 50 ? '✓' : '✗'}`);

console.log('\n[pre-emit] Test 5: getAllSkills() enumerates 4 core skills');
const allSkills = getAllSkills();
const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];
const corePresent = coreSkills.every(s => allSkills[s]);
console.log(`  all core skills present: ${corePresent ? '✓' : '✗'}`);
console.log(`  total skills found: ${Object.keys(allSkills).length}`);

console.log('\n[pre-emit] Test 6: getManifest() returns valid skill');
const manifest = getManifest('planning');
console.log(`  planning skill found: ${manifest && manifest.name === 'planning' ? '✓' : '✗'}`);
console.log(`  planning description: "${manifest.description.substring(0, 60)}..."`);

console.log('\n[pre-emit] Test 7: Error handling - non-existent skill');
const notFound = getManifest('nonexistent-skill');
console.log(`  returns null for missing skill: ${notFound === null ? '✓' : '✗'}`);

const allPass = gmParsed.name === 'gm' &&
  gmParsed.description.length > 50 &&
  gmParsed.allowedTools.includes('Skill') &&
  execParsed.name === 'gm-execute' &&
  execParsed.description.length > 50 &&
  emitParsed.name === 'gm-emit' &&
  emitParsed.description.length > 50 &&
  completeParsed.name === 'gm-complete' &&
  completeParsed.description.length > 50 &&
  corePresent &&
  manifest && manifest.name === 'planning' &&
  notFound === null;

console.log(`\n[pre-emit] ${allPass ? '✓ ALL TESTS PASSED - READY TO EMIT' : '✗ SOME TESTS FAILED'}`);
process.exit(allPass ? 0 : 1);
