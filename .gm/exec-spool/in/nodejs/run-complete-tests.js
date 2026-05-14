const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== COMPLETE PHASE GATE CHECKS ===\n');

try {
  console.log('1. Check test.js exists...');
  const testPath = path.join(process.cwd(), 'test.js');
  if (!fs.existsSync(testPath)) {
    console.log('   INFO: test.js does not exist (acceptable for library module)');
  } else {
    console.log('   OK: test.js exists');
    console.log('   Running test.js...');
    try {
      const output = execSync('node test.js', {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      });
      console.log('   OK: test.js passed');
      console.log(output);
    } catch (e) {
      console.error('   FAIL: test.js failed');
      console.error(e.stdout || e.message);
      process.exit(1);
    }
  }

  console.log('\n2. Verify daemon-bootstrap.js module...');
  const daemonBootstrapPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');

  delete require.cache[require.resolve(daemonBootstrapPath)];
  const mod = require(daemonBootstrapPath);

  const required = [
    'ensureAcptoapiRunning',
    'ensureRsCodeinsightDaemonRunning',
    'ensureRsSearchDaemonRunning',
    'ensureRsLearningDaemonRunning',
    'checkPortReachable',
  ];

  for (const fn of required) {
    if (typeof mod[fn] === 'function') {
      console.log(`   OK: ${fn} exported`);
    } else {
      console.error(`   FAIL: ${fn} not exported`);
      process.exit(1);
    }
  }

  console.log('\n3. Verify mutables.yml status...');
  const mutablesPath = path.join(process.cwd(), '.gm', 'mutables.yml');
  if (fs.existsSync(mutablesPath)) {
    const content = fs.readFileSync(mutablesPath, 'utf8');
    const unknownCount = (content.match(/status: unknown/g) || []).length;
    if (unknownCount > 0) {
      console.error(`   FAIL: ${unknownCount} unresolved mutables`);
      process.exit(1);
    } else {
      console.log('   OK: No unresolved mutables');
    }
  } else {
    console.log('   OK: mutables.yml empty/deleted');
  }

  console.log('\n4. Port reachability sanity check...');
  mod.checkPortReachable('127.0.0.1', 9999, 100).then(result => {
    if (result === false) {
      console.log('   OK: Port check returns false for unreachable port');
      console.log('\n=== ALL COMPLETE GATES PASSED ===');
      process.exit(0);
    } else {
      console.error('   FAIL: Port check returned unexpected result');
      process.exit(1);
    }
  }).catch(e => {
    console.error(`   FAIL: Port check error: ${e.message}`);
    process.exit(1);
  });

} catch (e) {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
}
