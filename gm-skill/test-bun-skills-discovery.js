const fs = require('fs');
const path = require('path');

console.log('=== GM-SKILL BUN SKILLS DISCOVERY TEST ===\n');

const skills = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete', 'update-docs'];
const skillsDir = path.join(__dirname, 'skills');
console.log(`Testing skills in: ${skillsDir}\n`);
let allPassed = true;

console.log('Testing skill structure and frontmatter...\n');

skills.forEach(skillName => {
  const skillPath = path.join(skillsDir, skillName);
  const skillMdPath = path.join(skillPath, 'SKILL.md');

  const hasDir = fs.existsSync(skillPath);
  const hasMd = hasDir && fs.existsSync(skillMdPath);

  if (!hasMd) {
    console.log(`✗ ${skillName}: SKILL.md not found at skills/${skillName}/SKILL.md`);
    allPassed = false;
    return;
  }

  const content = fs.readFileSync(skillMdPath, 'utf8');
  const match = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);

  if (!match) {
    console.log(`✗ ${skillName}: No YAML frontmatter in SKILL.md`);
    allPassed = false;
    return;
  }

  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*(.+?)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+?)$/m);

  if (!nameMatch || !nameMatch[1]) {
    console.log(`✗ ${skillName}: No or empty 'name' field in frontmatter`);
    allPassed = false;
    return;
  }

  if (!descMatch || !descMatch[1]) {
    console.log(`✗ ${skillName}: No or empty 'description' field in frontmatter`);
    allPassed = false;
    return;
  }

  console.log(`✓ ${skillName}: Valid SKILL.md with name="${nameMatch[1]}"`);
});

console.log('\nTesting manifest.js getAllSkills() export...\n');

try {
  const manifest = require('./lib/manifest.js');
  const allSkills = manifest.getAllSkills();

  if (allSkills.length !== skills.length) {
    console.log(`✗ getAllSkills() returned ${allSkills.length} skills (expected ${skills.length})`);
    allPassed = false;
  } else {
    console.log(`✓ getAllSkills() returned ${skills.length} skills`);
  }

  allSkills.forEach(skill => {
    const hasName = skill.name && skill.name.length > 0;
    const hasDesc = skill.description && skill.description.length > 0;

    if (!hasName) {
      console.log(`✗ ${skill.name || '(unknown)'}: missing 'name' field`);
      allPassed = false;
    } else if (!hasDesc) {
      console.log(`✗ ${skill.name}: missing 'description' field`);
      allPassed = false;
    } else {
      console.log(`✓ ${skill.name}: has name and description`);
    }
  });
} catch (e) {
  console.log(`✗ Error loading manifest.js: ${e.message}`);
  allPassed = false;
}

console.log('\n=== RESULT ===\n');

if (allPassed) {
  console.log('✓ All tests passed. Skills are discoverable by bun CLI.');
  process.exit(0);
} else {
  console.log('✗ Some tests failed. Skills may not be discoverable.');
  process.exit(1);
}
