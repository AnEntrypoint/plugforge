const fs = require('fs');
const path = require('path');

console.log('=== FINAL VERIFICATION ===\n');

const daemonBootstrapPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');
console.log('1. Checking daemon-bootstrap.js exists...');
if (fs.existsSync(daemonBootstrapPath)) {
  const stat = fs.statSync(daemonBootstrapPath);
  console.log('   ✓ File exists at', daemonBootstrapPath);
  console.log('   ✓ Size:', stat.size, 'bytes');

  try {
    const mod = require(daemonBootstrapPath);
    console.log('   ✓ Module loads successfully');
    console.log('   ✓ Exports:', Object.keys(mod).join(', '));

    const required = ['ensureAcptoapiRunning', 'ensureRsLearningDaemonRunning', 'ensureRsCodeinsightDaemonRunning', 'ensureRsSearchDaemonRunning'];
    const missing = required.filter(fn => !mod[fn]);
    if (missing.length === 0) {
      console.log('   ✓ All required functions present');
    } else {
      console.log('   ✗ Missing functions:', missing.join(', '));
      process.exit(1);
    }
  } catch (e) {
    console.log('   ✗ Module load error:', e.message);
    process.exit(1);
  }
} else {
  console.log('   ✗ File does not exist');
  process.exit(1);
}

console.log('\n2. Checking mutables.yml...');
const mutablesPath = path.join(process.cwd(), '.gm', 'mutables.yml');
if (fs.existsSync(mutablesPath)) {
  const content = fs.readFileSync(mutablesPath, 'utf8');
  const mutables = ['daemon-bootstrap-module-shape', 'session-id-threading-pattern', 'acptoapi-port-check-pattern'];

  mutables.forEach(id => {
    const hasId = content.includes(`id: ${id}`);
    const hasWitnessed = content.includes(`id: ${id}`) && content.split(`id: ${id}`)[1].split('\n')[4].includes('witnessed');
    console.log(`   ${hasId ? '✓' : '✗'} ${id} present`);
    console.log(`   ${hasWitnessed ? '✓' : '✗'} ${id} witnessed`);
  });
} else {
  console.log('   ✗ mutables.yml does not exist');
  process.exit(1);
}

console.log('\n3. Code quality checks...');
const content = fs.readFileSync(daemonBootstrapPath, 'utf8');
const checks = [
  ['Uses net.Socket', content.includes('new net.Socket()')],
  ['Port check timeout 500ms', content.includes('timeoutMs = 500')],
  ['Spawn detached', content.includes('detached: true')],
  ['Stdio ignore', content.includes("stdio: 'ignore'")],
  ['windowsHide flag', content.includes('windowsHide: true')],
  ['SESSION_ID threading', content.includes('CLAUDE_SESSION_ID')],
  ['Status file writing', content.includes('writeStatusFile')],
  ['Graceful fallback', content.includes('fallback')],
  ['ObsEvent logging', content.includes('obsEvent')],
];

checks.forEach(([desc, result]) => {
  console.log(`   ${result ? '✓' : '✗'} ${desc}`);
});

console.log('\n=== VERIFICATION COMPLETE ===');
