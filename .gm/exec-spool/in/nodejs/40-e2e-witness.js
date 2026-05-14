const fs = require('fs');
const path = require('path');

console.log('[e2e-witness] End-to-end verification of skill-metadata-compat\n');

console.log('[e2e-witness] Step 1: Verify manifest.js exists and loads');
const manifestPath = path.join(process.cwd(), 'gm-skill', 'lib', 'manifest.js');
if (!fs.existsSync(manifestPath)) {
  console.error('[e2e-witness] ✗ manifest.js not found at', manifestPath);
  process.exit(1);
}
console.log('[e2e-witness] ✓ manifest.js exists');

console.log('\n[e2e-witness] Step 2: Import and verify exports');
delete require.cache[require.resolve(manifestPath)];
const manifest = require(manifestPath);
const requiredExports = ['parseSkillMarkdown', 'getAllSkills', 'getManifest', 'getSkill'];
for (const exp of requiredExports) {
  if (typeof manifest[exp] !== 'function') {
    console.error(`[e2e-witness] ✗ Missing export: ${exp}`);
    process.exit(1);
  }
}
console.log('[e2e-witness] ✓ All exports present and callable');

console.log('\n[e2e-witness] Step 3: Verify CRLF handling (normalization)');
const skillPath = path.join(process.cwd(), 'gm-starter/skills/gm/SKILL.md');
const rawContent = fs.readFileSync(skillPath, 'utf8');
const hasCRLF = rawContent.includes('\r\n');
const gmSkill = manifest.getManifest('gm');
if (!gmSkill || !gmSkill.name) {
  console.error('[e2e-witness] ✗ Failed to parse gm skill despite CRLF normalization');
  process.exit(1);
}
console.log(`[e2e-witness] ✓ CRLF normalization working (file has CRLF: ${hasCRLF})`);

console.log('\n[e2e-witness] Step 4: Core skill parsing - all 4 skills');
const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];
const results = {};

for (const skillName of coreSkills) {
  const skill = manifest.getManifest(skillName);

  if (!skill || !skill.name || skill.name !== skillName) {
    console.error(`[e2e-witness] ✗ ${skillName}: name mismatch`);
    process.exit(1);
  }

  if (!skill.description || skill.description.length < 20) {
    console.error(`[e2e-witness] ✗ ${skillName}: description empty or too short`);
    process.exit(1);
  }

  if (!Array.isArray(skill.allowedTools)) {
    console.error(`[e2e-witness] ✗ ${skillName}: allowedTools not an array`);
    process.exit(1);
  }

  results[skillName] = {
    name: skill.name,
    descLength: skill.description.length,
    toolsCount: skill.allowedTools.length
  };

  console.log(`[e2e-witness] ✓ ${skillName}: desc=${skill.description.length} chars, tools=[${skill.allowedTools.join(', ')}]`);
}

console.log('\n[e2e-witness] Step 5: getAllSkills() includes all core skills');
const allSkills = manifest.getAllSkills();
const allSkillNames = Object.keys(allSkills);
for (const skillName of coreSkills) {
  if (!allSkills[skillName]) {
    console.error(`[e2e-witness] ✗ ${skillName} not in getAllSkills()`);
    process.exit(1);
  }
}
console.log(`[e2e-witness] ✓ All 4 core skills in getAllSkills() (total: ${allSkillNames.length})`);

console.log('\n[e2e-witness] Step 6: gm-skill/index.js exports manifest');
const indexPath = path.join(process.cwd(), 'gm-skill', 'index.js');
delete require.cache[require.resolve(indexPath)];
const gmSkill = require(indexPath);
if (!gmSkill.manifest || typeof gmSkill.manifest.getManifest !== 'function') {
  console.error('[e2e-witness] ✗ gm-skill/index.js does not export manifest with getManifest');
  process.exit(1);
}
console.log('[e2e-witness] ✓ gm-skill/index.js.manifest.getManifest callable');

console.log('\n[e2e-witness] Step 7: Verify no stale content in parsed skills');
for (const skillName of coreSkills) {
  const skill = gmSkill.manifest.getManifest(skillName);
  if (skill.description.length === 0) {
    console.error(`[e2e-witness] ✗ ${skillName}: empty description (CRLF bug not fixed)`);
    process.exit(1);
  }
  if (skill.description.includes('\r')) {
    console.error(`[e2e-witness] ✗ ${skillName}: unstripped CRLF in description`);
    process.exit(1);
  }
}
console.log('[e2e-witness] ✓ No unstripped CRLF or empty descriptions in any core skill');

console.log('\n[e2e-witness] Step 8: Error handling - graceful for missing skills');
const missing = manifest.getManifest('does-not-exist');
if (missing !== null) {
  console.error('[e2e-witness] ✗ getManifest should return null for missing skills');
  process.exit(1);
}
console.log('[e2e-witness] ✓ getManifest returns null for non-existent skills');

console.log('\n[e2e-witness] ✓✓✓ ALL E2E TESTS PASSED ✓✓✓');
console.log('[e2e-witness] skill-metadata-compat PRD item COMPLETE');

process.exit(0);
