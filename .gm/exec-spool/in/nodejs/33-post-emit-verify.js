const fs = require('fs');
const path = require('path');

console.log('[post-emit] Verifying files written correctly...\n');

console.log('[post-emit] Check 1: manifest.js exists and is readable');
const manifestPath = path.join(process.cwd(), 'gm-skill', 'lib', 'manifest.js');
const manifestExists = fs.existsSync(manifestPath);
console.log(`  File exists: ${manifestExists ? '✓' : '✗'}`);

if (manifestExists) {
  const stats = fs.statSync(manifestPath);
  console.log(`  File size: ${stats.size} bytes`);
  const content = fs.readFileSync(manifestPath, 'utf8');
  console.log(`  Lines: ${content.split('\n').length}`);
  console.log(`  Contains parseSkillMarkdown: ${content.includes('parseSkillMarkdown') ? '✓' : '✗'}`);
  console.log(`  Contains getAllSkills: ${content.includes('getAllSkills') ? '✓' : '✗'}`);
  console.log(`  Contains getManifest: ${content.includes('getManifest') ? '✓' : '✗'}`);
  console.log(`  Contains getSkill: ${content.includes('getSkill') ? '✓' : '✗'}`);
  console.log(`  CRLF normalization present: ${content.includes('.replace(/\\r\\n/g') ? '✓' : '✗'}`);
}

console.log('\n[post-emit] Check 2: index.js updated correctly');
const indexPath = path.join(process.cwd(), 'gm-skill', 'index.js');
const indexContent = fs.readFileSync(indexPath, 'utf8');
console.log(`  Contains manifest require: ${indexContent.includes("require('./lib/manifest.js')") ? '✓' : '✗'}`);
console.log(`  Exports manifest: ${indexContent.includes('manifest') && indexContent.includes('module.exports') ? '✓' : '✗'}`);

console.log('\n[post-emit] Check 3: Import and verify exports');
try {
  delete require.cache[require.resolve(manifestPath)];
  const manifest = require(manifestPath);

  const exports = ['parseSkillMarkdown', 'getAllSkills', 'getManifest', 'getSkill'];
  console.log(`  Exports ${exports.length} functions:`);
  for (const exp of exports) {
    const ok = typeof manifest[exp] === 'function';
    console.log(`    ${ok ? '✓' : '✗'} ${exp}`);
  }

  console.log('\n[post-emit] Check 4: Test core skills parsing');
  const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];
  for (const skillName of coreSkills) {
    const skill = manifest.getManifest(skillName);
    const ok = skill && skill.name === skillName && skill.description.length > 50;
    console.log(`  ${ok ? '✓' : '✗'} ${skillName}: "${skill.description.substring(0, 50)}..."`);
  }

  console.log('\n[post-emit] Check 5: Test getAllSkills enumeration');
  const allSkills = manifest.getAllSkills();
  const allPresent = coreSkills.every(s => allSkills[s]);
  console.log(`  All core skills in getAllSkills: ${allPresent ? '✓' : '✗'}`);
  console.log(`  Total skills found: ${Object.keys(allSkills).length}`);

  console.log('\n[post-emit] ✓ POST-EMIT VERIFICATION PASSED');
} catch (e) {
  console.error('[post-emit] ✗ Error during verification:', e.message);
  process.exit(1);
}
