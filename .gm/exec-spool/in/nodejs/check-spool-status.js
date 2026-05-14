const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';
const inDir = 'C:\\dev\\gm\\.gm\\exec-spool\\in';

console.log('[check-spool-status] Checking spool task completion status');

// List JSON metadata files (completed tasks)
const jsonFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.json')).sort((a, b) => {
  const aNum = parseInt(a.split('.')[0]);
  const bNum = parseInt(b.split('.')[0]);
  return aNum - bNum;
});

console.log(`\n[check-spool-status] Completed tasks (${jsonFiles.length}):`);
jsonFiles.forEach(f => {
  const meta = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
  console.log(`  ${f}: exitCode=${meta.exitCode}, duration=${meta.durationMs}ms, timedOut=${meta.timedOut}`);
});

// List pending tasks in inbox
const inboxDirs = fs.readdirSync(inDir);
let pendingCount = 0;
inboxDirs.forEach(dir => {
  const dirPath = path.join(inDir, dir);
  if (fs.statSync(dirPath).isDirectory()) {
    const files = fs.readdirSync(dirPath);
    pendingCount += files.length;
  }
});

console.log(`\n[check-spool-status] Pending tasks in inbox: ${pendingCount}`);

// Check for our validation test files specifically
const validationTests = [
  'test-gm-gc-structure.js',
  'test-gm-gc-integration.js',
  'test-gm-gc-gemini.js',
  'test-feature-parity.js',
  'quick-validation.js',
  'test-bun-gm-gc.js'
];

console.log('\n[check-spool-status] Validation test status:');
validationTests.forEach(test => {
  const taskNum = test.match(/\d+/)?.[0] || '?';
  const hasOut = fs.existsSync(path.join(outDir, `${taskNum}.out`));
  const hasJson = fs.existsSync(path.join(outDir, `${taskNum}.json`));
  const status = hasJson ? 'COMPLETE' : (hasOut ? 'IN_PROGRESS' : 'PENDING');
  console.log(`  ${test}: ${status}`);
});

console.log('\n[check-spool-status] All output files:');
fs.readdirSync(outDir).forEach(f => console.log(`  ${f}`));
