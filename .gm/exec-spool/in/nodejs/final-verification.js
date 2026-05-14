const fs = require('fs');
const path = require('path');

const checks = [];

try {
  console.log('=== FINAL VERIFICATION ===\n');

  console.log('1. Checking daemon-bootstrap.js file exists');
  const dbPath = 'C:\\dev\\gm\\gm-skill\\lib\\daemon-bootstrap.js';
  if (fs.existsSync(dbPath)) {
    const stat = fs.statSync(dbPath);
    console.log(`✓ File exists: ${stat.size} bytes\n`);
    checks.push(true);
  } else {
    console.error(`✗ File not found: ${dbPath}\n`);
    checks.push(false);
  }

  console.log('2. Checking gm-skill/index.js imports local daemon-bootstrap');
  const indexPath = 'C:\\dev\\gm\\gm-skill\\index.js';
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes("require('./lib/daemon-bootstrap.js')")) {
    console.log('✓ index.js requires local daemon-bootstrap\n');
    checks.push(true);
  } else {
    console.error('✗ index.js does not require local daemon-bootstrap\n');
    checks.push(false);
  }

  console.log('3. Checking package.json exports');
  const pkgPath = 'C:\\dev\\gm\\gm-skill\\package.json';
  const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkgContent.exports['./daemon-bootstrap'] === './lib/daemon-bootstrap.js') {
    console.log('✓ package.json exports daemon-bootstrap correctly\n');
    checks.push(true);
  } else {
    console.error('✗ package.json export path incorrect\n');
    checks.push(false);
  }

  console.log('4. Checking PRD status');
  const prdPath = 'C:\\dev\\gm\\.gm\\prd.yml';
  const prdContent = fs.readFileSync(prdPath, 'utf8');
  if (prdContent.includes('status: completed') && prdContent.includes('gm-skill-framework-bootstrap')) {
    console.log('✓ PRD item marked as completed\n');
    checks.push(true);
  } else {
    console.error('✗ PRD item status incorrect\n');
    checks.push(false);
  }

  console.log('5. Checking CHANGELOG updated');
  const changelogPath = 'C:\\dev\\gm\\CHANGELOG.md';
  const changelogContent = fs.readFileSync(changelogPath, 'utf8');
  if (changelogContent.includes('daemon-bootstrap.js')) {
    console.log('✓ CHANGELOG.md updated\n');
    checks.push(true);
  } else {
    console.error('✗ CHANGELOG.md not updated\n');
    checks.push(false);
  }

  console.log('6. Testing module import');
  try {
    const daemonBootstrap = require('C:\\dev\\gm\\gm-skill\\lib\\daemon-bootstrap.js');
    const required = ['checkState', 'spawn', 'waitForReady', 'getSocket', 'shutdown'];
    const allPresent = required.every(fn => typeof daemonBootstrap[fn] === 'function');
    if (allPresent) {
      console.log('✓ All required functions importable and callable\n');
      checks.push(true);
    } else {
      console.error('✗ Some functions missing or not callable\n');
      checks.push(false);
    }
  } catch (e) {
    console.error(`✗ Import failed: ${e.message}\n`);
    checks.push(false);
  }

  console.log('7. Checking gm-skill/index.js re-exports');
  try {
    const gmSkill = require('C:\\dev\\gm\\gm-skill\\index.js');
    const required = ['checkState', 'spawn', 'waitForReady', 'getSocket', 'shutdown'];
    const allPresent = required.every(fn => typeof gmSkill[fn] === 'function');
    if (allPresent) {
      console.log('✓ All functions re-exported via index.js\n');
      checks.push(true);
    } else {
      console.error('✗ Re-export incomplete\n');
      checks.push(false);
    }
  } catch (e) {
    console.error(`✗ index.js import failed: ${e.message}\n`);
    checks.push(false);
  }

  const passed = checks.filter(c => c).length;
  const total = checks.length;

  console.log(`=== SUMMARY ===`);
  console.log(`${passed}/${total} checks passed`);

  if (passed === total) {
    console.log('\n✓✓✓ ALL CHECKS PASSED ✓✓✓');
    process.exit(0);
  } else {
    console.error('\n✗✗✗ SOME CHECKS FAILED ✗✗✗');
    process.exit(1);
  }
} catch (e) {
  console.error('Verification error:', e.message);
  console.error(e.stack);
  process.exit(1);
}
