const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = '/c/dev/gm';
process.chdir(cwd);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     FULL EXECUTION: npm install → test → commit → push     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

function step(name, fn) {
  console.log(`${name}`);
  try {
    fn();
    console.log('  ✓ OK\n');
    return true;
  } catch (e) {
    console.error(`  ✗ FAILED: ${e.message}\n`);
    return false;
  }
}

let success = true;

success &= step('Step 1/5: Delete package-lock.json', () => {
  try {
    fs.unlinkSync('package-lock.json');
  } catch (e) {
    console.log('  (not found)');
  }
});

success &= step('Step 2/5: npm install', () => {
  execSync('npm install', { stdio: 'inherit' });
  if (!fs.existsSync('node_modules/js-yaml')) {
    throw new Error('js-yaml missing after install');
  }
});

success &= step('Step 3/5: node test.js', () => {
  const output = execSync('node test.js', { encoding: 'utf8' });
  console.log(output);
});

success &= step('Step 4/5: git add, commit, push', () => {
  execSync('git add test.js package.json', { stdio: 'pipe' });
  const msg = 'fix: add js-yaml dependency and correct test assertions for case sensitivity and hooks structure';
  execSync(`git commit -m "${msg}"`, { stdio: 'pipe' });
  const log = execSync('git log --oneline -1', { encoding: 'utf8' });
  console.log(`  Committed: ${log.trim()}`);
  execSync('git push origin main', { stdio: 'pipe' });
  console.log('  Pushed to origin/main');
});

success &= step('Step 5/5: Delete .gm/prd.yml', () => {
  if (fs.existsSync('.gm/prd.yml')) {
    fs.unlinkSync('.gm/prd.yml');
  }
});

if (success) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   ✓ ALL STEPS PASSED                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  process.exit(0);
} else {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                 ✗ EXECUTION FAILED                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  process.exit(1);
}
