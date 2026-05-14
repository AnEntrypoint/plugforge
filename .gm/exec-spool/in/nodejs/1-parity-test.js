const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const TEST_DIR = path.join(os.tmpdir(), `gm-parity-test-${Date.now()}`);
const RESULTS_FILE = path.join(TEST_DIR, 'parity-results.json');

const results = {
  startTime: new Date().toISOString(),
  testDir: TEST_DIR,
  gm_skill: { ok: false, outputs: {}, errors: [] },
  gm_cc: { ok: false, outputs: {}, errors: [] },
  comparison: { identical: false, divergences: [] },
  endTime: null
};

try {
  console.log(`\n=== GM PARITY TEST ===\nTest directory: ${TEST_DIR}\n`);

  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

  const gmRoot = 'C:\\dev\\gm';
  const gmSkillPath = path.join(gmRoot, 'gm-skill');
  const gmBuiltCcPath = path.join(gmRoot, 'gm-build', 'gm-cc');

  if (!fs.existsSync(gmSkillPath)) {
    throw new Error(`gm-skill not found at ${gmSkillPath}`);
  }
  if (!fs.existsSync(gmBuiltCcPath)) {
    throw new Error(`gm-build/gm-cc not found at ${gmBuiltCcPath}`);
  }

  console.log('Step 1: Test gm-skill path (skills-only)...');
  try {
    const gmSkillIndexPath = path.join(gmSkillPath, 'lib', 'index.js');
    if (!fs.existsSync(gmSkillIndexPath)) {
      throw new Error(`gm-skill/lib/index.js not found`);
    }
    const gmSkillIndex = require(path.resolve(gmSkillIndexPath));
    if (typeof gmSkillIndex !== 'function') {
      throw new Error('gm-skill/lib/index.js does not export a function');
    }

    results.gm_skill.ok = true;
    results.gm_skill.outputs.moduleLoaded = true;
    results.gm_skill.outputs.path = gmSkillIndexPath;
    console.log('✓ gm-skill module loads successfully');
  } catch (err) {
    results.gm_skill.errors.push(`Module load failed: ${err.message}`);
    console.log(`✗ gm-skill module load failed: ${err.message}`);
  }

  console.log('\nStep 2: Test gm-cc hook path (hook-based)...');
  try {
    const hooksPath = path.join(gmBuiltCcPath, 'hooks', 'hooks.json');
    if (!fs.existsSync(hooksPath)) {
      throw new Error(`hooks.json not found at ${hooksPath}`);
    }
    const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    results.gm_cc.ok = true;
    results.gm_cc.outputs.hooksPath = hooksPath;
    results.gm_cc.outputs.hookCount = Object.keys(hooks.hooks || {}).length;
    console.log(`✓ gm-cc hooks loaded: ${results.gm_cc.outputs.hookCount} events`);
  } catch (err) {
    results.gm_cc.errors.push(`Hook load failed: ${err.message}`);
    console.log(`✗ gm-cc hook load failed: ${err.message}`);
  }

  console.log('\nStep 3: Verify skill file existence...');
  const coreSkills = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete', 'update-docs'];
  const skillsStatus = {};
  for (const skill of coreSkills) {
    const gmSkillMdPath = path.join(gmSkillPath, 'skills', skill, 'SKILL.md');
    const gmStarterMdPath = path.join(gmRoot, 'gm-starter', 'skills', skill, 'SKILL.md');
    const gmCcMdPath = path.join(gmBuiltCcPath, 'skills', skill, 'SKILL.md');

    skillsStatus[skill] = {
      gm_skill: fs.existsSync(gmSkillMdPath),
      gm_starter: fs.existsSync(gmStarterMdPath),
      gm_cc_built: fs.existsSync(gmCcMdPath)
    };

    const allPresent = skillsStatus[skill].gm_skill && skillsStatus[skill].gm_starter && skillsStatus[skill].gm_cc_built;
    console.log(`  ${allPresent ? '✓' : '✗'} ${skill}: gm-skill=${skillsStatus[skill].gm_skill} starter=${skillsStatus[skill].gm_starter} cc=${skillsStatus[skill].gm_cc_built}`);

    if (!allPresent) {
      results.comparison.divergences.push(`Skill ${skill} missing in one or more paths`);
    }
  }
  results.comparison.skillsStatus = skillsStatus;

  console.log('\nStep 4: Verify module presence...');
  const requiredModules = [
    'gm-starter/lib/spool-dispatch.js',
    'gm-starter/lib/learning.js',
    'gm-starter/lib/codeinsight.js',
    'gm-starter/lib/git.js',
    'gm-starter/lib/browser.js',
    'gm-starter/lib/daemon-bootstrap.js'
  ];

  const moduleStatus = {};
  for (const mod of requiredModules) {
    const fullPath = path.join(gmRoot, mod);
    const exists = fs.existsSync(fullPath);
    moduleStatus[mod] = { exists };

    if (exists) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        moduleStatus[mod].hasExports = content.includes('module.exports') || content.includes('exports');
        moduleStatus[mod].size = content.length;
        console.log(`  ✓ ${mod}: ${content.length}B`);
      } catch (err) {
        moduleStatus[mod].error = err.message;
        console.log(`  ✗ ${mod}: read failed: ${err.message}`);
      }
    } else {
      console.log(`  ✗ ${mod}: missing`);
      results.comparison.divergences.push(`Module missing: ${mod}`);
    }
  }
  results.comparison.moduleStatus = moduleStatus;

  console.log('\nStep 5: Verify gm-starter vs gm-skill skill deduplication...');
  const dedup = {};
  for (const skill of coreSkills) {
    const starterPath = path.join(gmRoot, 'gm-starter', 'skills', skill, 'SKILL.md');
    const skillPath = path.join(gmSkillPath, 'skills', skill, 'SKILL.md');

    if (fs.existsSync(starterPath) && fs.existsSync(skillPath)) {
      const starterContent = fs.readFileSync(starterPath, 'utf8');
      const skillContent = fs.readFileSync(skillPath, 'utf8');
      dedup[skill] = {
        identical: starterContent === skillContent,
        starterSize: starterContent.length,
        skillSize: skillContent.length
      };
      const match = dedup[skill].identical ? '✓' : '✗';
      console.log(`  ${match} ${skill}: starter=${starterContent.length}B, skill=${skillContent.length}B`);
      if (!dedup[skill].identical) {
        results.comparison.divergences.push(`Skill ${skill} differs between gm-starter and gm-skill`);
      }
    }
  }
  results.comparison.skillDedup = dedup;

  console.log('\nStep 6: Check git state...');
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: gmRoot });
    const isDirty = status.trim().length > 0;
    const changes = status.trim().split('\n').filter(l => l.length);
    results.comparison.gitState = {
      isDirty,
      changeCount: changes.length,
      changes: changes.slice(0, 10)
    };
    console.log(`  Git state: isDirty=${isDirty}, changes=${changes.length}`);
  } catch (err) {
    results.comparison.gitState = { error: err.message };
  }

  console.log('\nStep 7: Summary...');
  const summary = {
    gmSkillReady: results.gm_skill.ok,
    gmCcReady: results.gm_cc.ok,
    allModulesPresent: Object.values(moduleStatus).every(m => m.exists),
    allSkillsPresent: Object.values(skillsStatus).every(s => s.gm_skill && s.gm_starter && s.gm_cc_built),
    skillsIdentical: Object.values(dedup).every(d => d.identical),
    divergenceCount: results.comparison.divergences.length
  };
  results.comparison.summary = summary;

  console.log(`✓ gm-skill ready: ${summary.gmSkillReady}`);
  console.log(`✓ gm-cc ready: ${summary.gmCcReady}`);
  console.log(`✓ All modules present: ${summary.allModulesPresent}`);
  console.log(`✓ All skills present: ${summary.allSkillsPresent}`);
  console.log(`✓ Skills identical (gm-starter/gm-skill dedup): ${summary.skillsIdentical}`);
  console.log(`Divergences found: ${summary.divergenceCount}`);

  if (results.comparison.divergences.length > 0) {
    console.log('\nDivergences:');
    results.comparison.divergences.forEach(d => console.log(`  - ${d}`));
  }

} catch (err) {
  results.gm_skill.errors.push(`Test error: ${err.message}`);
  console.error(`\n✗ Parity test failed: ${err.message}`);
  process.exit(1);
} finally {
  results.endTime = new Date().toISOString();
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\nResults: ${RESULTS_FILE}`);
  console.log(JSON.stringify(results.comparison.summary, null, 2));
}
