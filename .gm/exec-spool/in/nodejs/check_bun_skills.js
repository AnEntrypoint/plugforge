const fs = require('fs');
const path = require('path');

console.log('=== Checking bun x skills CLI expectations ===\n');

const repoRoot = 'C:\\dev\\gm\\gm-skill';

console.log('Checking for SKILL.md patterns at root:');
const rootFiles = fs.readdirSync(repoRoot);
const skillsAtRoot = rootFiles.filter(f => f.endsWith('.SKILL.md') || f === 'SKILL.md');
console.log('  Root level SKILL.md files:', skillsAtRoot.length);

const skillsDir = path.join(repoRoot, 'skills');
console.log('\nChecking skills/ directory:');
const skillsDirFiles = fs.readdirSync(skillsDir);
const flatSkillsInDir = skillsDirFiles.filter(f => f.endsWith('.SKILL.md'));
const skillDirs = skillsDirFiles.filter(f => {
  const stat = fs.statSync(path.join(skillsDir, f));
  return stat.isDirectory();
});

console.log('  Flat .SKILL.md files in skills/:', flatSkillsInDir.length);
flatSkillsInDir.forEach(f => console.log(`    - ${f}`));
console.log('  Subdirectories with nested SKILL.md:', skillDirs.length);
skillDirs.forEach(d => {
  const skillMd = path.join(skillsDir, d, 'SKILL.md');
  console.log(`    - ${d}/ (has nested SKILL.md: ${fs.existsSync(skillMd)})`);
});

console.log('\n=== Theory ===');
console.log('bun x skills likely scans:');
console.log('  1. <root>/*.SKILL.md');
console.log('  2. <root>/skills/*.SKILL.md');
console.log('  3. <root>/SKILL.md');
console.log('But NOT: <root>/skills/<name>/SKILL.md');
