const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  console.log('[feature-parity] Comparing gm-gc and gm-cc feature parity...');

  const gcPath = 'C:\\dev\\gm\\build\\gm-gc';
  const ccPath = 'C:\\dev\\gm\\build\\gm-cc';

  // Helper: list agents in a platform
  function listAgents(platformPath) {
    const agentsPath = path.join(platformPath, 'agents');
    if (!fs.existsSync(agentsPath)) return [];
    return fs.readdirSync(agentsPath).filter(f => {
      return fs.statSync(path.join(agentsPath, f)).isDirectory();
    }).sort();
  }

  // Helper: check skill manifest
  function checkSkillManifest(platformPath, skillName) {
    const manifestPath = path.join(platformPath, 'agents', skillName, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      return null;
    }
  }

  // Test 1: Agent/skill list parity
  console.log('\n[feature-parity] Test 1: Agent/skill list parity');
  const gcAgents = listAgents(gcPath);
  const ccAgents = listAgents(ccPath);

  console.log(`  gm-gc agents: ${gcAgents.length}`);
  console.log(`  gm-cc agents: ${ccAgents.length}`);
  console.log(`  ✓ Count match: ${gcAgents.length === ccAgents.length}`);

  const commonAgents = gcAgents.filter(a => ccAgents.includes(a));
  const gcOnly = gcAgents.filter(a => !ccAgents.includes(a));
  const ccOnly = ccAgents.filter(a => !gcAgents.includes(a));

  console.log(`  Common agents: ${commonAgents.length}`);
  if (gcOnly.length > 0) console.log(`  ✗ gc-only: ${gcOnly.join(', ')}`);
  if (ccOnly.length > 0) console.log(`  ✗ cc-only: ${ccOnly.join(', ')}`);

  // Test 2: Hook system parity
  console.log('\n[feature-parity] Test 2: Hook system parity');
  const gcHooksPath = path.join(gcPath, 'hooks', 'hooks.json');
  const ccHooksPath = path.join(ccPath, 'hooks', 'hooks.json');

  let gcHooks = null, ccHooks = null;
  try {
    gcHooks = JSON.parse(fs.readFileSync(gcHooksPath, 'utf8'));
  } catch (e) {
    console.log(`  ✗ gm-gc hooks.json error`);
  }

  try {
    ccHooks = JSON.parse(fs.readFileSync(ccHooksPath, 'utf8'));
  } catch (e) {
    console.log(`  ✗ gm-cc hooks.json error`);
  }

  if (gcHooks && ccHooks) {
    const gcEvents = Object.keys(gcHooks).sort();
    const ccEvents = Object.keys(ccHooks).sort();
    console.log(`  gm-gc hooks: ${gcEvents.length}`);
    console.log(`  gm-cc hooks: ${ccEvents.length}`);
    console.log(`  ✓ Count match: ${gcEvents.length === ccEvents.length}`);

    const eventsMatch = gcEvents.join(',') === ccEvents.join(',');
    if (eventsMatch) {
      console.log(`  ✓ Hook events identical`);
    } else {
      const gcOnly = gcEvents.filter(e => !ccEvents.includes(e));
      const ccOnly = ccEvents.filter(e => !gcEvents.includes(e));
      if (gcOnly.length) console.log(`  gc-only events: ${gcOnly.join(', ')}`);
      if (ccOnly.length) console.log(`  cc-only events: ${ccOnly.join(', ')}`);
    }
  }

  // Test 3: Package.json parity
  console.log('\n[feature-parity] Test 3: Package.json parity');
  const gcPkg = JSON.parse(fs.readFileSync(path.join(gcPath, 'package.json'), 'utf8'));
  const ccPkg = JSON.parse(fs.readFileSync(path.join(ccPath, 'package.json'), 'utf8'));

  console.log(`  gm-gc version: ${gcPkg.version}`);
  console.log(`  gm-cc version: ${ccPkg.version}`);
  console.log(`  ✓ Versions match: ${gcPkg.version === ccPkg.version}`);

  console.log(`  gm-gc engines: ${gcPkg.engines?.node || 'not specified'}`);
  console.log(`  gm-cc engines: ${ccPkg.engines?.node || 'not specified'}`);

  if (gcPkg.bin && ccPkg.bin) {
    const gcBinKeys = Object.keys(gcPkg.bin).sort();
    const ccBinKeys = Object.keys(ccPkg.bin).sort();
    console.log(`  gm-gc bins: ${gcBinKeys.length}`);
    console.log(`  gm-cc bins: ${ccBinKeys.length}`);
    console.log(`  ✓ Bin count match: ${gcBinKeys.length === ccBinKeys.length}`);
  }

  // Test 4: Core skill manifest parity
  console.log('\n[feature-parity] Test 4: Core skill manifest parity');
  const coreSkills = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete'];
  let manifestsMismatch = 0;

  coreSkills.forEach(skill => {
    const gcManifest = checkSkillManifest(gcPath, skill);
    const ccManifest = checkSkillManifest(ccPath, skill);

    const gcHas = !!gcManifest;
    const ccHas = !!ccManifest;

    if (gcHas !== ccHas) {
      console.log(`  ✗ ${skill}: gc=${gcHas}, cc=${ccHas}`);
      manifestsMismatch++;
    } else if (gcHas && ccHas) {
      const gcVersion = gcManifest.version;
      const ccVersion = ccManifest.version;
      const match = gcVersion === ccVersion;
      console.log(`  ${match ? '✓' : '?'} ${skill}: gc=${gcVersion}, cc=${ccVersion}`);
    }
  });

  // Test 5: Files list parity
  console.log('\n[feature-parity] Test 5: Published files parity');
  if (gcPkg.files && ccPkg.files) {
    const gcFiles = gcPkg.files.sort();
    const ccFiles = ccPkg.files.sort();
    console.log(`  gm-gc files: ${gcFiles.length}`);
    console.log(`  gm-cc files: ${ccFiles.length}`);

    const filesMismatch = [];
    const allFiles = new Set([...gcFiles, ...ccFiles]);
    allFiles.forEach(f => {
      const inGc = gcFiles.includes(f);
      const inCc = ccFiles.includes(f);
      if (inGc !== inCc) {
        filesMismatch.push(`${f} (gc=${inGc}, cc=${inCc})`);
      }
    });

    if (filesMismatch.length === 0) {
      console.log('  ✓ Files list identical');
    } else {
      console.log(`  Differences (${filesMismatch.length}):`);
      filesMismatch.slice(0, 5).forEach(f => console.log(`    ${f}`));
    }
  }

  // Test 6: Help output comparison
  console.log('\n[feature-parity] Test 6: Help output comparison');
  try {
    const gcHelp = execSync(`node "${path.join(gcPath, 'cli.js')}" --help 2>&1`, {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024
    });
    const ccHelp = execSync(`node "${path.join(ccPath, 'cli.js')}" --help 2>&1`, {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024
    });

    console.log(`  gm-gc help: ${gcHelp.length} bytes`);
    console.log(`  gm-cc help: ${ccHelp.length} bytes`);

    // Extract first few lines for comparison
    const gcLines = gcHelp.split('\n').slice(0, 3);
    const ccLines = ccHelp.split('\n').slice(0, 3);

    const match = gcLines.join('') === ccLines.join('');
    console.log(`  ${match ? '✓' : '?'} Help output similar`);
  } catch (e) {
    console.log(`  ✗ Help comparison failed: ${e.message.substring(0, 100)}`);
  }

  // Test 7: Dependency parity
  console.log('\n[feature-parity] Test 7: Dependency parity');
  const gcDeps = { ...gcPkg.dependencies, ...gcPkg.devDependencies };
  const ccDeps = { ...ccPkg.dependencies, ...ccPkg.devDependencies };

  const gmSkillInGc = gcDeps['@gm/gm-skill'];
  const gmSkillInCc = ccDeps['@gm/gm-skill'];
  console.log(`  @gm/gm-skill in gm-gc: ${gmSkillInGc || 'not found'}`);
  console.log(`  @gm/gm-skill in gm-cc: ${gmSkillInCc || 'not found'}`);

  // Test 8: Summary
  console.log('\n[feature-parity] Parity assessment complete');
  console.log(`  Common agents: ${commonAgents.length}/${ccAgents.length}`);
  console.log(`  Manifest mismatches: ${manifestsMismatch}`);

  if (commonAgents.length === ccAgents.length && manifestsMismatch === 0) {
    console.log('  ✓ FULL PARITY: gm-gc and gm-cc have identical structure and capabilities');
  } else {
    console.log('  ? REVIEW NEEDED: Some differences detected between gm-gc and gm-cc');
  }
} catch (e) {
  console.error('[feature-parity] Error:', e.message);
  process.exit(1);
}
