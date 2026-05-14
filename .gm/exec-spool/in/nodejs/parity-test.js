const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const TEST_DIR = path.join(os.tmpdir(), `gm-parity-test-${Date.now()}`);
const TASK_A = 'parity-test-task-a';
const TASK_B = 'parity-test-task-b';
const RESULTS_FILE = path.join(TEST_DIR, 'parity-results.json');

const results = {
  startTime: new Date().toISOString(),
  testDir: TEST_DIR,
  tasks: { A: TASK_A, B: TASK_B },
  gm_skill: { ok: false, outputs: {}, errors: [] },
  gm_cc: { ok: false, outputs: {}, errors: [] },
  comparison: { identical: false, divergences: [] },
  endTime: null
};

try {
  console.log(`\n=== GM PARITY TEST ===\nTest directory: ${TEST_DIR}\n`);

  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

  const gmRoot = path.resolve('.');
  const gmSkillPath = path.join(gmRoot, 'gm-skill');
  const gmBuiltCcPath = path.join(gmRoot, 'gm-build', 'gm-cc');

  if (!fs.existsSync(gmSkillPath)) {
    throw new Error(`gm-skill not found at ${gmSkillPath}`);
  }
  if (!fs.existsSync(gmBuiltCcPath)) {
    throw new Error(`gm-build/gm-cc not found at ${gmBuiltCcPath}`);
  }

  const IDENTICAL_REQUEST = {
    action: 'gm',
    prompt: 'Create a simple test file at ./test-output.md with content: "# Test\nThis is a parity test."',
    sessionId: 'parity-test-session'
  };

  console.log('Step 1: Test gm-skill path (skills-only)...');
  const skillTestDir = path.join(TEST_DIR, TASK_A);
  fs.mkdirSync(skillTestDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillTestDir, 'request.json'),
    JSON.stringify(IDENTICAL_REQUEST, null, 2)
  );

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
  const ccTestDir = path.join(TEST_DIR, TASK_B);
  fs.mkdirSync(ccTestDir, { recursive: true });
  fs.writeFileSync(
    path.join(ccTestDir, 'request.json'),
    JSON.stringify(IDENTICAL_REQUEST, null, 2)
  );

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

  console.log('\nStep 3: Compare PRD structures...');
  const prdPath = path.join(gmRoot, '.gm', 'prd.yml');
  if (fs.existsSync(prdPath)) {
    const prdContent = fs.readFileSync(prdPath, 'utf8');
    results.comparison.prdFile = {
      exists: true,
      size: prdContent.length,
      itemCount: (prdContent.match(/^- id:/gm) || []).length
    };
    console.log(`✓ PRD file: ${results.comparison.prdFile.itemCount} items, ${results.comparison.prdFile.size} bytes`);
  } else {
    results.comparison.divergences.push('PRD file missing');
    console.log('✗ PRD file not found');
  }

  console.log('\nStep 4: Verify skill file existence...');
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

  console.log('\nStep 5: Check git state compatibility...');
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: gmRoot });
    const isDirty = status.trim().length > 0;
    results.comparison.gitState = {
      isDirty,
      changeCount: status.trim().split('\n').filter(l => l.length).length,
      status: status.slice(0, 500)
    };
    console.log(`  Git state: isDirty=${isDirty}, changes=${results.comparison.gitState.changeCount}`);
  } catch (err) {
    results.comparison.divergences.push(`Git status check failed: ${err.message}`);
  }

  console.log('\nStep 6: Verify AGENTS.md consistency...');
  const agentsPath = path.join(gmRoot, 'AGENTS.md');
  const agentsContent = fs.readFileSync(agentsPath, 'utf8');
  results.comparison.agentsFile = {
    exists: true,
    size: agentsContent.length,
    hasSkillBundlingDoc: agentsContent.includes('bundled platforms'),
    hasDaemonBootstrapPattern: agentsContent.includes('daemon-bootstrap'),
    hasHookEliminationSection: agentsContent.includes('skill-driven gate')
  };
  console.log(`  AGENTS.md: ${results.comparison.agentsFile.size} bytes, skill-bundling=${results.comparison.agentsFile.hasSkillBundlingDoc}`);

  console.log('\nStep 7: Module import sanity check...');
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
        console.log(`  ✓ ${mod}: ${content.length}B, exports=${moduleStatus[mod].hasExports}`);
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

  console.log('\nStep 8: Test infrastructure summary...');
  const summary = {
    testDirCreated: fs.existsSync(TEST_DIR),
    prdFilePresent: fs.existsSync(prdPath),
    gmSkillReady: results.gm_skill.ok,
    gmCcReady: results.gm_cc.ok,
    allModulesPresent: Object.values(moduleStatus).every(m => m.exists),
    allSkillsPresent: Object.values(skillsStatus).every(s => s.gm_skill && s.gm_starter && s.gm_cc_built)
  };
  results.comparison.summary = summary;

  console.log(`\nSummary:`);
  console.log(`  Test dir created: ${summary.testDirCreated}`);
  console.log(`  PRD file present: ${summary.prdFilePresent}`);
  console.log(`  gm-skill ready: ${summary.gmSkillReady}`);
  console.log(`  gm-cc ready: ${summary.gmCcReady}`);
  console.log(`  All modules present: ${summary.allModulesPresent}`);
  console.log(`  All skills present: ${summary.allSkillsPresent}`);
  console.log(`  Divergences found: ${results.comparison.divergences.length}`);

} catch (err) {
  results.gm_skill.errors.push(`Test setup error: ${err.message}`);
  console.error(`\n✗ Parity test failed: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
} finally {
  results.endTime = new Date().toISOString();
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\nResults written to: ${RESULTS_FILE}`);
}
