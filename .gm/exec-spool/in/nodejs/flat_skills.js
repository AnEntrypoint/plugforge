const fs = require('fs');
const path = require('path');

const skillsDir = 'C:\\dev\\gm\\gm-skill\\skills';
const dirs = fs.readdirSync(skillsDir);

console.log('=== Flattening SKILL.md files ===\n');

dirs.forEach(dir => {
  const srcPath = path.join(skillsDir, dir, 'SKILL.md');
  const destPath = path.join(skillsDir, `${dir}.SKILL.md`);

  if (fs.existsSync(srcPath)) {
    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(destPath, content);
    console.log(`✓ Created ${dir}.SKILL.md`);
  }
});

console.log('\n=== Verifying flat structure ===\n');
const flatFiles = fs.readdirSync(skillsDir)
  .filter(f => f.endsWith('.SKILL.md'))
  .sort();

flatFiles.forEach(f => {
  console.log(`  skills/${f}`);
});

console.log(`\nTotal: ${flatFiles.length} skills discoverable`);
