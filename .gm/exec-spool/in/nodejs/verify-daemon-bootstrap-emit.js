const fs = require('fs');
const path = require('path');

const daemonBootstrapPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');

console.log('=== PRE-EMIT VERIFICATION ===\n');

console.log('1. Check file exists and line count...');
if (!fs.existsSync(daemonBootstrapPath)) {
  console.error('   FAIL: daemon-bootstrap.js does not exist');
  process.exit(1);
}

const content = fs.readFileSync(daemonBootstrapPath, 'utf8');
const lineCount = content.split('\n').length;
console.log(`   OK: File exists, ${lineCount} lines`);

if (lineCount > 200) {
  console.error(`   FAIL: Exceeds 200-line limit (${lineCount} lines)`);
  process.exit(1);
}

console.log('\n2. Test module import...');
try {
  delete require.cache[require.resolve(daemonBootstrapPath)];
  const mod = require(daemonBootstrapPath);
  console.log('   OK: Module imports successfully');
  console.log(`   Exports: ${Object.keys(mod).join(', ')}`);
} catch (e) {
  console.error(`   FAIL: Import error: ${e.message}`);
  process.exit(1);
}

console.log('\n3. Verify required exports...');
const required = [
  'ensureAcptoapiRunning',
  'ensureRsCodeinsightDaemonRunning',
  'ensureRsSearchDaemonRunning',
  'ensureRsLearningDaemonRunning',
  'checkPortReachable',
];

const mod = require(daemonBootstrapPath);
let missing = [];
required.forEach(name => {
  if (typeof mod[name] !== 'function') {
    console.log(`   FAIL: ${name} is not a function`);
    missing.push(name);
  } else {
    console.log(`   OK: ${name}`);
  }
});

if (missing.length > 0) {
  console.error(`\n   Missing functions: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('\n4. Test checkPortReachable with unreachable port...');
mod.checkPortReachable('127.0.0.1', 9999, 100).then(result => {
  if (result === false) {
    console.log('   OK: Returns false for unreachable port');
  } else {
    console.error(`   FAIL: Expected false, got ${result}`);
    process.exit(1);
  }

  console.log('\n5. Code quality checks...');
  const hasComments = /\/\/|\/\*/.test(content);
  console.log(`   ${hasComments ? 'WARN' : 'OK'}: No comments`);

  const hasTodo = /TODO|FIXME/.test(content);
  console.log(`   ${hasTodo ? 'WARN' : 'OK'}: No TODO/FIXME`);

  const hasNetModule = content.includes('require(\'net\')');
  if (hasNetModule) {
    console.log('   OK: net.Socket included');
  } else {
    console.error('   FAIL: net.Socket missing');
    process.exit(1);
  }

  const hasPortCheck = content.includes('checkPortReachable');
  if (hasPortCheck) {
    console.log('   OK: Port reachability check implemented');
  } else {
    console.error('   FAIL: Port check missing');
    process.exit(1);
  }

  const hasSessionId = content.includes('CLAUDE_SESSION_ID');
  if (hasSessionId) {
    console.log('   OK: SESSION_ID threading present');
  } else {
    console.error('   FAIL: SESSION_ID missing');
    process.exit(1);
  }

  console.log('\n=== PRE-EMIT VERIFICATION PASSED ===');
}).catch(e => {
  console.error(`Port check error: ${e.message}`);
  process.exit(1);
});
