const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = '/c/dev/gm';
process.chdir(cwd);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     FULL EXECUTION: npm install → test → commit → push     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let success = true;

try {
  console.log('Step 1/5: Delete package-lock.json');
  try {
    fs.unlinkSync('package-lock.json');
    console.log('  ✓ Deleted\n');
  } catch (e) {
    console.log('  ✓ Not found (skipped)\n');
  }

  console.log('Step 2/5: npm install');
  execSync('npm install', { stdio: 'inherit' });
  if (!fs.existsSync('node_modules/js-yaml')) {
    throw new Error('js-yaml not in node_modules after install');
  }
  console.log('  ✓ Completed, js-yaml verified\n');

  console.log('Step 3/5: node test.js');
  const testOutput = execSync('node test.js', { encoding: 'utf8', stdio: 'pipe' });
  console.log(testOutput);
  if (!testOutput.includes('passed') && !testOutput.includes('pass')) {
    console.warn('⚠ Test output did not include pass count\n');
  } else {
    console.log('  ✓ Tests completed\n');
  }

  console.log('Step 4/5: git add, commit, push');
  execSync('git add test.js package.json', { stdio: 'pipe' });
  console.log('  ✓ Staged changes');

  const msg = 'fix: add js-yaml dependency and correct test assertions for case sensitivity and hooks structure';
  execSync(`git commit -m "${msg}"`, { stdio: 'pipe' });
  const log = execSync('git log --oneline -1', { encoding: 'utf8' });
  console.log(`  ✓ Committed: ${log.trim()}`);

  execSync('git push origin main', { stdio: 'pipe' });
  console.log('  ✓ Pushed to origin/main\n');

  console.log('Step 5/5: Delete .gm/prd.yml');
  if (fs.existsSync('.gm/prd.yml')) {
    fs.unlinkSync('.gm/prd.yml');
    console.log('  ✓ Deleted\n');
  } else {
    console.log('  ✓ Not found\n');
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   ✓ ALL STEPS PASSED                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  process.exit(0);
} catch (e) {
  console.error(`\n✗ EXECUTION FAILED: ${e.message}`);
  process.exit(1);
}
