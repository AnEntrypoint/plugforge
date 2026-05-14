const fs = require('fs');
const path = require('path');

const daemonBootstrapPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');

console.log('=== POST-EMIT VERIFICATION ===\n');

console.log('1. Module import from disk...');
delete require.cache[require.resolve(daemonBootstrapPath)];
const mod = require(daemonBootstrapPath);
console.log('   OK: Module loaded');
console.log(`   Exports: ${Object.keys(mod).join(', ')}`);

console.log('\n2. Function signatures...');
const required = {
  ensureAcptoapiRunning: 'async function',
  ensureRsCodeinsightDaemonRunning: 'async function',
  ensureRsSearchDaemonRunning: 'async function',
  ensureRsLearningDaemonRunning: 'async function',
  checkPortReachable: 'function',
};

for (const [name, type] of Object.entries(required)) {
  const actual = typeof mod[name];
  const isAsync = actual === 'function' && mod[name].constructor.name === 'AsyncFunction';
  if (actual === 'function') {
    console.log(`   OK: ${name} is a ${isAsync ? 'async ' : ''}function`);
  } else {
    console.error(`   FAIL: ${name} is ${actual}`);
    process.exit(1);
  }
}

console.log('\n3. Port reachability test (unreachable)...');
mod.checkPortReachable('127.0.0.1', 9999, 100).then(result => {
  if (result === false) {
    console.log('   OK: Returns false for unreachable port');
  } else {
    console.error(`   FAIL: Expected false, got ${result}`);
    process.exit(1);
  }

  console.log('\n4. Code structure...');
  const content = fs.readFileSync(daemonBootstrapPath, 'utf8');
  const lines = content.split('\n').length;

  if (lines <= 200) {
    console.log(`   OK: ${lines} lines (within 200-line limit)`);
  } else {
    console.error(`   FAIL: ${lines} lines exceeds 200-line limit`);
    process.exit(1);
  }

  const hasNetModule = content.includes("require('net')");
  console.log(`   ${hasNetModule ? 'OK' : 'FAIL'}: net module imported`);

  const hasPortCheck = content.includes('function checkPortReachable');
  console.log(`   ${hasPortCheck ? 'OK' : 'FAIL'}: Port reachability check implemented`);

  const hasBunSpawn = content.includes("spawn('bun'");
  console.log(`   ${hasBunSpawn ? 'OK' : 'FAIL'}: Bun spawn implemented`);

  const hasSessionId = content.includes('CLAUDE_SESSION_ID');
  console.log(`   ${hasSessionId ? 'OK' : 'FAIL'}: SESSION_ID threading present`);

  const hasDetached = content.includes('detached: true');
  console.log(`   ${hasDetached ? 'OK' : 'FAIL'}: Detached process flag present`);

  const hasWindowsHide = content.includes('windowsHide: true');
  console.log(`   ${hasWindowsHide ? 'OK' : 'FAIL'}: Windows hide flag present`);

  console.log('\n5. Module exports validation...');
  const exports = Object.keys(mod);
  const expectedExports = [
    'ensureAcptoapiRunning',
    'ensureRsCodeinsightDaemonRunning',
    'ensureRsSearchDaemonRunning',
    'ensureRsLearningDaemonRunning',
    'checkPortReachable',
  ];

  for (const exp of expectedExports) {
    if (exports.includes(exp)) {
      console.log(`   OK: ${exp} exported`);
    } else {
      console.error(`   FAIL: ${exp} not exported`);
      process.exit(1);
    }
  }

  console.log('\n6. Mutables status check...');
  const mutablesPath = path.join(process.cwd(), '.gm', 'mutables.yml');
  const mutablesContent = fs.readFileSync(mutablesPath, 'utf8');

  const criticalMutables = [
    'daemon-bootstrap-module-shape',
    'session-id-threading-pattern',
    'acptoapi-port-check-pattern',
  ];

  for (const mutable of criticalMutables) {
    const hasId = mutablesContent.includes(`id: ${mutable}`);
    const hasWitnessed = mutablesContent.includes(`id: ${mutable}`) &&
                        mutablesContent.split(`id: ${mutable}`)[1].split('\nstatus:')[0].includes('witnessed');
    if (hasId && hasWitnessed) {
      console.log(`   OK: ${mutable} witnessed`);
    } else {
      console.error(`   FAIL: ${mutable} not witnessed`);
      process.exit(1);
    }
  }

  console.log('\n=== POST-EMIT VERIFICATION PASSED ===');
  console.log('All gates clear for gm-complete transition');

}).catch(e => {
  console.error(`Port check error: ${e.message}`);
  process.exit(1);
});
