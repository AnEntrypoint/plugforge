const fs = require('fs');
const path = require('path');

const gmRoot = 'C:\\dev\\gm';
const gmSkillPath = path.join(gmRoot, 'gm-skill');
const gmBuiltCcPath = path.join(gmRoot, 'gm-build', 'gm-cc');

const results = { divergences: [] };

console.log(`=== PARITY TEST EXECUTION ===\n`);

try {
  console.log('1. Checking gm-skill presence...');
  if (!fs.existsSync(gmSkillPath)) {
    throw new Error(`gm-skill directory missing at ${gmSkillPath}`);
  }
  console.log(`✓ gm-skill exists`);

  console.log('\n2. Checking gm-cc presence...');
  if (!fs.existsSync(gmBuiltCcPath)) {
    throw new Error(`gm-build/gm-cc missing at ${gmBuiltCcPath}`);
  }
  console.log(`✓ gm-cc exists`);

  console.log('\n3. Verifying core skills...');
  const coreSkills = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete', 'update-docs'];
  const skillCheck = {};

  for (const skill of coreSkills) {
    const paths = {
      skill: path.join(gmSkillPath, 'skills', skill, 'SKILL.md'),
      starter: path.join(gmRoot, 'gm-starter', 'skills', skill, 'SKILL.md'),
      cc: path.join(gmBuiltCcPath, 'skills', skill, 'SKILL.md')
    };

    skillCheck[skill] = {
      skillExists: fs.existsSync(paths.skill),
      starterExists: fs.existsSync(paths.starter),
      ccExists: fs.existsSync(paths.cc)
    };

    const allExist = skillCheck[skill].skillExists && skillCheck[skill].starterExists && skillCheck[skill].ccExists;
    const status = allExist ? '✓' : '✗';
    console.log(`  ${status} ${skill}`);

    if (!allExist) {
      results.divergences.push(`${skill}: skill=${skillCheck[skill].skillExists} starter=${skillCheck[skill].starterExists} cc=${skillCheck[skill].ccExists}`);
    }

    if (skillCheck[skill].skillExists && skillCheck[skill].starterExists) {
      const skillContent = fs.readFileSync(paths.skill, 'utf8');
      const starterContent = fs.readFileSync(paths.starter, 'utf8');
      if (skillContent !== starterContent) {
        results.divergences.push(`${skill}: gm-skill and gm-starter differ (${skillContent.length}B vs ${starterContent.length}B)`);
        console.log(`    WARNING: gm-skill (${skillContent.length}B) != gm-starter (${starterContent.length}B)`);
      }
    }
  }

  console.log('\n4. Checking required modules...');
  const modules = [
    'gm-starter/lib/spool-dispatch.js',
    'gm-starter/lib/learning.js',
    'gm-starter/lib/codeinsight.js',
    'gm-starter/lib/git.js',
    'gm-starter/lib/browser.js',
    'gm-starter/lib/daemon-bootstrap.js'
  ];

  for (const mod of modules) {
    const fullPath = path.join(gmRoot, mod);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✓' : '✗';
    console.log(`  ${status} ${mod}`);
    if (!exists) {
      results.divergences.push(`Module missing: ${mod}`);
    }
  }

  console.log('\n5. Checking hooks.json...');
  const hooksPath = path.join(gmBuiltCcPath, 'hooks', 'hooks.json');
  if (fs.existsSync(hooksPath)) {
    const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    const hookCount = Object.keys(hooks.hooks || {}).length;
    console.log(`✓ hooks.json: ${hookCount} hook events`);
  } else {
    console.log(`✗ hooks.json missing`);
    results.divergences.push('hooks.json missing from gm-cc');
  }

  console.log('\n6. Summary...');
  console.log(`Divergences found: ${results.divergences.length}`);
  if (results.divergences.length > 0) {
    console.log('\nDivergences:');
    results.divergences.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
  } else {
    console.log('✓ No divergences detected');
  }

  console.log('\n7. Test completeness check...');
  const allSkillsPresent = coreSkills.every(s => skillCheck[s].skillExists && skillCheck[s].starterExists && skillCheck[s].ccExists);
  const allModulesPresent = modules.every(m => fs.existsSync(path.join(gmRoot, m)));

  console.log(`All skills present: ${allSkillsPresent}`);
  console.log(`All modules present: ${allModulesPresent}`);
  console.log(`Parity test PASSED: ${results.divergences.length === 0 && allSkillsPresent && allModulesPresent}`);

} catch (err) {
  console.error(`\nTest failed: ${err.message}`);
  process.exit(1);
}
