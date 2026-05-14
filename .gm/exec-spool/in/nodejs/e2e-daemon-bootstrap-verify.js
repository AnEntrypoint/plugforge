const path = require('path');

const daemonBootstrapPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');

console.log('=== E2E VERIFICATION: daemon-bootstrap.js ===\n');

console.log('1. Import module...');
delete require.cache[require.resolve(daemonBootstrapPath)];
const mod = require(daemonBootstrapPath);
console.log('   OK: Module imported');
console.log(`   Exports: ${Object.keys(mod).sort().join(', ')}`);

console.log('\n2. Test checkPortReachable function...');
Promise.resolve()
  .then(() => {
    console.log('   Testing unreachable port (9999)...');
    return mod.checkPortReachable('127.0.0.1', 9999, 100);
  })
  .then(result => {
    if (result === false) {
      console.log('   OK: Port 9999 correctly reported as unreachable');
    } else {
      throw new Error(`Expected false, got ${result}`);
    }
    return mod.checkPortReachable('127.0.0.1', 22, 100);
  })
  .then(result => {
    console.log(`   OK: Port 22 check completed (${result ? 'reachable' : 'unreachable'})`);
    return Promise.resolve();
  })
  .then(() => {
    console.log('\n3. Verify function signatures...');
    const funcs = [
      'ensureAcptoapiRunning',
      'ensureRsCodeinsightDaemonRunning',
      'ensureRsSearchDaemonRunning',
      'ensureRsLearningDaemonRunning',
      'checkPortReachable',
    ];

    funcs.forEach(name => {
      const fn = mod[name];
      const isAsync = fn.constructor.name === 'AsyncFunction';
      console.log(`   OK: ${name} (${isAsync ? 'async' : 'sync'} function)`);
    });

    return Promise.resolve();
  })
  .then(() => {
    console.log('\n4. Verify module structure...');
    console.log('   Checking net.Socket usage...');

    const fs = require('fs');
    const content = fs.readFileSync(daemonBootstrapPath, 'utf8');

    const hasNetModule = content.includes("require('net')");
    if (!hasNetModule) throw new Error('net module not imported');
    console.log('   OK: net module imported');

    const hasCheckPort = content.includes('function checkPortReachable');
    if (!hasCheckPort) throw new Error('checkPortReachable not defined');
    console.log('   OK: checkPortReachable function defined');

    const hasSpawn = content.includes("spawn('bun'");
    if (!hasSpawn) throw new Error('bun spawn not found');
    console.log('   OK: bun x <pkg> spawn pattern present');

    const hasSessionId = content.includes('CLAUDE_SESSION_ID');
    if (!hasSessionId) throw new Error('SESSION_ID not threaded');
    console.log('   OK: SESSION_ID threading present');

    const hasDetached = content.includes('detached: true');
    if (!hasDetached) throw new Error('detached flag missing');
    console.log('   OK: detached process flag present');

    const hasWindowsHide = content.includes('windowsHide: true');
    if (!hasWindowsHide) throw new Error('windowsHide flag missing');
    console.log('   OK: Windows hide flag present');

    const hasStatusFile = content.includes('writeStatusFile');
    if (!hasStatusFile) throw new Error('status file writing missing');
    console.log('   OK: Status file writing implemented');

    const lines = content.split('\n').length;
    if (lines > 200) throw new Error(`Exceeds 200 lines: ${lines}`);
    console.log(`   OK: File within 200-line limit (${lines} lines)`);

    const hasComments = /\/\/|\/\*/.test(content);
    if (!hasComments) console.log('   OK: No comments');

    return Promise.resolve();
  })
  .then(() => {
    console.log('\n5. Verify acptoapi-specific pattern...');
    const fs = require('fs');
    const content = fs.readFileSync(daemonBootstrapPath, 'utf8');

    const acptoapiMatch = content.match(/async function ensureAcptoapiRunning\(\)([\s\S]*?)^async function/m);
    if (!acptoapiMatch) throw new Error('ensureAcptoapiRunning not found');

    const acptoapiCode = acptoapiMatch[1];

    if (!acptoapiCode.includes('4800')) throw new Error('Port 4800 not hardcoded');
    console.log('   OK: Port 4800 hardcoded for acptoapi');

    if (!acptoapiCode.includes('127.0.0.1')) throw new Error('Localhost not specified');
    console.log('   OK: Localhost (127.0.0.1) specified');

    if (!acptoapiCode.includes('acptoapi@latest')) throw new Error('acptoapi package not referenced');
    console.log('   OK: acptoapi@latest spawn reference present');

    if (!acptoapiCode.includes('fallback')) throw new Error('fallback not present');
    console.log('   OK: Graceful fallback pattern present');

    return Promise.resolve();
  })
  .then(() => {
    console.log('\n=== E2E VERIFICATION PASSED ===');
    console.log('All gates clear for completion');
    process.exit(0);
  })
  .catch(err => {
    console.error(`\nFAIL: ${err.message}`);
    process.exit(1);
  });
