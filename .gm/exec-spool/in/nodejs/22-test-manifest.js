const path = require('path');

const manifest = require(path.join(process.cwd(), 'gm-skill', 'lib', 'manifest.js'));

console.log('[test-manifest] Testing manifest module...\n');

const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];

console.log('[test-manifest] Loading core skills via getManifest():\n');

const results = {};
let allPass = true;

for (const skillName of coreSkills) {
  const skill = manifest.getManifest(skillName);

  if (!skill) {
    console.log(`✗ ${skillName}: NOT FOUND`);
    allPass = false;
    continue;
  }

  const nameOk = skill.name === skillName;
  const descOk = skill.description && skill.description.length > 20;
  const toolsOk = Array.isArray(skill.allowedTools);

  const status = (nameOk && descOk && toolsOk) ? '✓' : '✗';
  console.log(`${status} ${skillName}:`);
  console.log(`    name: "${skill.name}"`);
  console.log(`    description: "${skill.description.substring(0, 80)}..."`);
  console.log(`    allowedTools: [${skill.allowedTools.join(', ')}]`);
  console.log(`    compatiblePlatforms: ${skill.compatiblePlatforms.length} found`);
  console.log(`    endToEnd: ${skill.endToEnd}`);

  if (!nameOk || !descOk || !toolsOk) {
    allPass = false;
  }

  results[skillName] = { nameOk, descOk, toolsOk };
}

console.log('\n[test-manifest] getAllSkills() enumeration:\n');
const allSkills = manifest.getAllSkills();
const skillNames = Object.keys(allSkills).sort();
console.log(`Found ${skillNames.length} total skills`);
console.log(`Core 4 present: ${coreSkills.every(s => skillNames.includes(s)) ? '✓' : '✗'}`);

console.log('\n[test-manifest] Summary:');
for (const skillName of coreSkills) {
  const r = results[skillName];
  const pass = r && r.nameOk && r.descOk && r.toolsOk;
  console.log(`  ${pass ? '✓' : '✗'} ${skillName}`);
}

if (allPass && coreSkills.every(s => skillNames.includes(s))) {
  console.log('\n[test-manifest] ✓ ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log('\n[test-manifest] ✗ SOME TESTS FAILED');
  process.exit(1);
}
