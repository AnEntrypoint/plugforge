const fs = require('fs');
const path = require('path');

console.log('PRE-EMIT VERIFICATION\n');

const daemonBootstrapPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');

console.log('1. Import daemon-bootstrap module...');
try {
  const mod = require(daemonBootstrapPath);
  console.log('   ✓ Module imported');

  console.log('\n2. Test checkPortReachable (unreachable port)...');
  mod.checkPortReachable('127.0.0.1', 9999, 100).then(result => {
    console.log('   ✓ Port 9999 reachable:', result, '(expected: false)');
    if (result !== false) {
      console.error('   ✗ MISMATCH: expected false');
      process.exit(1);
    }
  }).catch(e => {
    console.error('   ✗ Error:', e.message);
    process.exit(1);
  });

} catch (e) {
  console.error('ERROR: Cannot import daemon-bootstrap.js:', e.message);
  process.exit(1);
}

setTimeout(() => {
  console.log('\n3. Checking mutables status...');
  const mutablesPath = path.join(process.cwd(), '.gm', 'mutables.yml');
  const content = fs.readFileSync(mutablesPath, 'utf8');

  const unknownCount = (content.match(/status: unknown/g) || []).length;
  const witnessedCount = (content.match(/status: witnessed/g) || []).length;

  console.log(`   Witnessed: ${witnessedCount}`);
  console.log(`   Unknown: ${unknownCount}`);

  if (unknownCount > 0) {
    console.error('   ✗ Unresolved mutables detected');
    process.exit(1);
  }

  console.log('   ✓ All mutables resolved');

  console.log('\n4. Code quality checks...');
  const daemonCode = fs.readFileSync(daemonBootstrapPath, 'utf8');
  const lines = daemonCode.split('\n').length;
  console.log(`   Lines: ${lines}`);

  if (lines > 200) {
    console.warn(`   ⚠ File exceeds 200 lines (${lines} lines)`);
  } else {
    console.log(`   ✓ Within 200-line limit`);
  }

  const hasComments = /\/\/|\/\*/.test(daemonCode);
  if (hasComments) {
    console.warn('   ⚠ Contains comments');
  } else {
    console.log('   ✓ No comments');
  }

  const hasTodo = /TODO|FIXME/.test(daemonCode);
  if (hasTodo) {
    console.warn('   ⚠ Contains TODO/FIXME markers');
  } else {
    console.log('   ✓ No TODO/FIXME');
  }

  console.log('\n5. Function export validation...');
  const required = ['ensureAcptoapiRunning', 'ensureRsLearningDaemonRunning', 'ensureRsCodeinsightDaemonRunning', 'ensureRsSearchDaemonRunning'];
  const mod = require(daemonBootstrapPath);

  required.forEach(fn => {
    const exists = typeof mod[fn] === 'function';
    console.log(`   ${exists ? '✓' : '✗'} ${fn}`);
    if (!exists) process.exit(1);
  });

  console.log('\n=== PRE-EMIT CHECK PASSED ===');
}, 200);
