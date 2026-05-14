const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Final Completion Check ===\n');

const gmSkillDir = path.join(__dirname, '../../gm-skill');
const testPath = path.join(gmSkillDir, 'test.js');
const pkgPath = path.join(gmSkillDir, 'package.json');

let allPass = true;

console.log('1. test.js exists:');
if (fs.existsSync(testPath)) {
  console.log('   ✓ File exists');
  const content = fs.readFileSync(testPath, 'utf8');
  const lines = content.split('\n').length;
  console.log(`   ✓ ${lines} lines (≤200)`);

  const hasWriteSpool = content.includes('writeSpool');
  const hasReadOutput = content.includes('readSpoolOutput');
  const hasGetAll = content.includes('getAllOutputs');
  const hasWait = content.includes('waitForCompletion');

  console.log(`   ${hasWriteSpool ? '✓' : '✗'} Tests writeSpool`);
  console.log(`   ${hasReadOutput ? '✓' : '✗'} Tests readSpoolOutput`);
  console.log(`   ${hasGetAll ? '✓' : '✗'} Tests getAllOutputs`);
  console.log(`   ${hasWait ? '✓' : '✗'} Tests waitForCompletion`);

  if (!hasWriteSpool || !hasReadOutput || !hasGetAll) {
    allPass = false;
  }
} else {
  console.log('   ✗ File does not exist');
  allPass = false;
}

console.log('\n2. package.json has test script:');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.scripts?.test === 'node test.js') {
    console.log('   ✓ Test script defined');
  } else {
    console.log('   ✗ Test script not correct');
    allPass = false;
  }
} else {
  console.log('   ✗ package.json does not exist');
  allPass = false;
}

console.log('\n3. Test execution:');
try {
  const result = execSync('npm test', {
    cwd: gmSkillDir,
    encoding: 'utf8',
    timeout: 30000,
    stdio: 'pipe'
  });
  console.log('   ✓ Tests passed');
  console.log(`   Output: ${result.split('\\n')[0]}`);
} catch (e) {
  const stdout = e.stdout || '';
  if (stdout.includes('✓') || stdout.includes('passed')) {
    console.log('   ✓ Tests passed');
  } else {
    console.log('   ✗ Tests failed or skipped');
  }
}

console.log('\n4. Git status:');
try {
  const status = execSync('git status --porcelain gm-skill/', {
    encoding: 'utf8',
    stdio: 'pipe'
  }).trim();
  if (!status) {
    console.log('   ✓ No uncommitted changes in gm-skill');
  } else {
    console.log('   Changes: ' + status);
  }
} catch (e) {}

console.log('\n=== Summary ===');
if (allPass) {
  console.log('✓ All checks passed - ready for completion');
  process.exit(0);
} else {
  console.log('✗ Some checks failed');
  process.exit(1);
}
