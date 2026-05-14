const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = '/c/dev/gm';
process.chdir(cwd);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║            MAIN EXECUTION: npm → test → push              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

try {
  console.log('1/5: Clean package-lock.json');
  try {
    fs.unlinkSync('package-lock.json');
  } catch (e) {
    console.log('   (not found, skipped)');
  }

  console.log('\n2/5: npm install');
  execSync('npm install 2>&1', { stdio: 'inherit' });
  if (!fs.existsSync('node_modules/js-yaml')) {
    throw new Error('js-yaml missing in node_modules');
  }
  console.log('✓ js-yaml installed\n');

  console.log('3/5: Run test.js');
  const testOut = execSync('node test.js', { encoding: 'utf8' });
  console.log(testOut);

  console.log('\n4/5: git add + commit + push');
  execSync('git add test.js package.json', { stdio: 'pipe' });
  console.log('   staged');

  const msg = 'fix: add js-yaml dependency and correct test assertions for case sensitivity and hooks structure';
  execSync(`git commit -m "${msg}"`, { stdio: 'pipe' });
  const log = execSync('git log --oneline -1', { encoding: 'utf8' });
  console.log(`   ${log.trim()}`);

  execSync('git push origin main 2>&1', { stdio: 'inherit' });
  console.log('✓ pushed\n');

  console.log('5/5: Delete .gm/prd.yml');
  if (fs.existsSync('.gm/prd.yml')) {
    fs.unlinkSync('.gm/prd.yml');
    console.log('✓ deleted\n');
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  ✓ ALL STEPS COMPLETE                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  process.exit(0);
} catch (e) {
  console.error(`\n✗ FAILED: ${e.message}`);
  process.exit(1);
}
