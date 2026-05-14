const fs = require('fs');
const path = require('path');

console.log('[assess-gm-gc-completion] Final state check before emit phase\n');

const prdPath = 'C:\\dev\\gm\\.gm\\prd.yml';
const mutablesPath = 'C:\\dev\\gm\\.gm\\mutables.yml';

let status = { ready: true, issues: [] };

// 1. Check PRD
console.log('1. PRD Status:');
if (fs.existsSync(prdPath)) {
  const prd = fs.readFileSync(prdPath, 'utf8');
  const lines = prd.trim().split('\n').length;
  console.log(`   [✓] PRD file exists (${lines} lines)`);

  if (lines < 20) {
    console.log(`   [⚠] PRD appears empty/minimal (${lines} lines)`);
    status.issues.push('PRD needs content for gm-gc validation items');
  } else {
    console.log(`   [✓] PRD has substantial content`);
  }
} else {
  console.log(`   [⚠] PRD file missing - may be okay if work is complete`);
}

// 2. Check mutables for gm-gc validation items
console.log('\n2. gm-gc Validation Mutables:');
const gcMutables = [
  'gm-gc-build-exists',
  'gm-gc-agents-complete',
  'gm-gc-hooks-configured',
  'gm-gc-skill-parity',
  'gm-gc-spool-helpers-available',
  'gm-gc-daemon-integration',
  'gm-gc-gemini-ready',
  'gm-gc-help-works',
  'gm-gc-installation-tested'
];

if (fs.existsSync(mutablesPath)) {
  const mutables = fs.readFileSync(mutablesPath, 'utf8');
  let witnessedCount = 0;
  let unknownCount = 0;

  gcMutables.forEach(id => {
    if (mutables.includes(`id: ${id}`)) {
      const entry = mutables.split(`id: ${id}`)[1].split('\n').slice(0, 8).join('\n');
      if (entry.includes('status: witnessed')) {
        console.log(`   [✓] ${id}`);
        witnessedCount++;
      } else if (entry.includes('status: unknown')) {
        console.log(`   [✗] ${id} - UNKNOWN`);
        unknownCount++;
        status.issues.push(`${id} is unknown`);
      } else {
        console.log(`   [?] ${id} - status unclear`);
      }
    }
  });

  console.log(`\n   Summary: ${witnessedCount} witnessed, ${unknownCount} unknown`);

  // Check for any unknown mutables blocking work
  const allUnknown = mutables.match(/status: unknown/g) || [];
  if (allUnknown.length > 0) {
    console.log(`   [⚠] WARNING: ${allUnknown.length} total unknown mutables still exist`);
    status.issues.push(`${allUnknown.length} mutables still have unknown status`);
  } else {
    console.log(`   [✓] All mutables are witnessed or completed`);
  }
} else {
  console.log(`   [⚠] mutables.yml missing`);
}

// 3. Check gm-gc build structure
console.log('\n3. gm-gc Build Structure:');
const gcBuildPath = 'C:\\dev\\gm\\build\\gm-gc';
const requiredDirs = ['agents', 'hooks', 'skills', 'lib'];
const requiredFiles = ['package.json', 'cli.js', 'GEMINI.md'];

let structureOk = true;
requiredDirs.forEach(dir => {
  const dirPath = path.join(gcBuildPath, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`   [✓] ${dir}/`);
  } else {
    console.log(`   [✗] ${dir}/ missing`);
    structureOk = false;
  }
});

requiredFiles.forEach(file => {
  const filePath = path.join(gcBuildPath, file);
  if (fs.existsSync(filePath)) {
    console.log(`   [✓] ${file}`);
  } else {
    console.log(`   [✗] ${file} missing`);
    structureOk = false;
  }
});

if (!structureOk) {
  status.issues.push('gm-gc build structure incomplete');
}

// 4. Check git state
console.log('\n4. Git Repository State:');
try {
  const { execSync } = require('child_process');

  const status_out = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status_out.trim() === '') {
    console.log('   [✓] Working tree clean');
  } else {
    console.log('   [⚠] Uncommitted changes:');
    status_out.split('\n').slice(0, 5).forEach(line => {
      if (line) console.log(`       ${line}`);
    });
  }

  const log_out = execSync('git log --oneline -1', { encoding: 'utf8' });
  console.log(`   [✓] Latest commit: ${log_out.trim()}`);
} catch (e) {
  console.log(`   [✗] Git error: ${e.message.split('\n')[0]}`);
}

// Final determination
console.log('\n=== READINESS ASSESSMENT ===');
if (status.issues.length === 0) {
  console.log('[✓] READY FOR FINAL PHASE');
  console.log('    - All gm-gc validation mutables witnessed');
  console.log('    - Build structure complete');
  console.log('    - Git state clean');
  console.log('    - Next: Invoke gm-emit → gm-complete');
  process.exit(0);
} else {
  console.log('[⚠] ISSUES DETECTED - MAY NEED ATTENTION');
  status.issues.forEach(issue => {
    console.log(`    - ${issue}`);
  });

  // Determine if blocking
  const blockingIssues = status.issues.filter(i => i.includes('unknown'));
  if (blockingIssues.length > 0) {
    console.log('\n[✗] Blocking issues found - cannot proceed to emit');
    process.exit(1);
  } else {
    console.log('\n[✓] Non-blocking issues - can proceed with caution');
    process.exit(0);
  }
}
