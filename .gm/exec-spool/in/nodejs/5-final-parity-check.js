const fs = require('fs');
const path = require('path');

const gmRoot = 'C:\\dev\\gm';
console.log('=== Final Parity Check ===\n');

const checks = {
  gm_skill_exists: fs.existsSync(path.join(gmRoot, 'gm-skill')),
  gm_cc_exists: fs.existsSync(path.join(gmRoot, 'gm-build', 'gm-cc')),
  gm_starter_exists: fs.existsSync(path.join(gmRoot, 'gm-starter'))
};

console.log('Repository structure:');
console.log(`  gm-skill: ${checks.gm_skill_exists}`);
console.log(`  gm-build/gm-cc: ${checks.gm_cc_exists}`);
console.log(`  gm-starter: ${checks.gm_starter_exists}`);

const skillsToCheck = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete', 'update-docs'];
const skillsResult = {};

console.log('\nSkill presence check:');
for (const skill of skillsToCheck) {
  const gmSkillMd = path.join(gmRoot, 'gm-skill', 'skills', skill, 'SKILL.md');
  const starterMd = path.join(gmRoot, 'gm-starter', 'skills', skill, 'SKILL.md');
  const ccMd = path.join(gmRoot, 'gm-build', 'gm-cc', 'skills', skill, 'SKILL.md');

  skillsResult[skill] = {
    gm_skill: fs.existsSync(gmSkillMd),
    gm_starter: fs.existsSync(starterMd),
    gm_cc: fs.existsSync(ccMd)
  };

  const allExist = skillsResult[skill].gm_skill && skillsResult[skill].gm_starter && skillsResult[skill].gm_cc;
  console.log(`  ${allExist ? '✓' : '✗'} ${skill}: gm-skill=${skillsResult[skill].gm_skill} starter=${skillsResult[skill].gm_starter} cc=${skillsResult[skill].gm_cc}`);
}

const modulesToCheck = ['gm-starter/lib/spool-dispatch.js', 'gm-starter/lib/learning.js', 'gm-starter/lib/codeinsight.js', 'gm-starter/lib/git.js', 'gm-starter/lib/browser.js', 'gm-starter/lib/daemon-bootstrap.js'];
const modulesResult = {};

console.log('\nModule presence check:');
for (const mod of modulesToCheck) {
  const fullPath = path.join(gmRoot, mod);
  const exists = fs.existsSync(fullPath);
  modulesResult[mod] = exists;
  console.log(`  ${exists ? '✓' : '✗'} ${mod}`);
}

console.log('\nHooks check:');
const hooksPath = path.join(gmRoot, 'gm-build', 'gm-cc', 'hooks', 'hooks.json');
if (fs.existsSync(hooksPath)) {
  const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
  console.log(`  ✓ hooks.json: ${Object.keys(hooks.hooks || {}).length} events`);
} else {
  console.log(`  ✗ hooks.json missing`);
}

const allSkillsPresent = skillsToCheck.every(s => skillsResult[s].gm_skill && skillsResult[s].gm_starter && skillsResult[s].gm_cc);
const allModulesPresent = modulesToCheck.every(m => modulesResult[m]);

console.log('\nSummary:');
console.log(`  All skills present: ${allSkillsPresent}`);
console.log(`  All modules present: ${allModulesPresent}`);
console.log(`  Core structure sound: ${checks.gm_skill_exists && checks.gm_cc_exists && checks.gm_starter_exists}`);
console.log(`\nParity test: ${allSkillsPresent && allModulesPresent ? 'PASSED ✓' : 'FAILED ✗'}`);
