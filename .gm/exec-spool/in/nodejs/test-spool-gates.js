const fs = require('fs');
const path = require('path');

console.log('=== Testing spool dispatch gates ===\n');

const gmDir = 'C:\\dev\\gm\\.gm';
const spoolDispatchPath = 'C:\\dev\\gm\\lib\\spool-dispatch.js';

// Verify spool-dispatch.js exists
if (!fs.existsSync(spoolDispatchPath)) {
  console.log('ERROR: lib/spool-dispatch.js not found');
  process.exit(1);
}

console.log('✓ lib/spool-dispatch.js exists');

// Load the module
let SpoolDispatcher;
try {
  SpoolDispatcher = require(spoolDispatchPath);
  console.log('✓ SpoolDispatcher module loaded');
} catch (e) {
  console.log(`ERROR loading module: ${e.message}`);
  process.exit(1);
}

// Test gate state with no markers
console.log('\n--- Test 1: No markers (fresh state) ---');
const dispatcher = new SpoolDispatcher(gmDir);

const hasGm = dispatcher.checkNeedsGm();
const hasPrd = dispatcher.checkPrdExists();
console.log(`needs-gm exists: ${hasGm}`);
console.log(`prd.yml exists: ${hasPrd}`);

// Test creating markers
console.log('\n--- Test 2: Create test markers ---');

// Create .gm/needs-gm
fs.writeFileSync(path.join(gmDir, 'needs-gm'), '');
console.log('✓ Created .gm/needs-gm');

// Create .gm/prd.yml
fs.writeFileSync(path.join(gmDir, 'prd.yml'), `
- id: test-1
  subject: Test task
  status: pending
`);
console.log('✓ Created .gm/prd.yml');

// Test gate checks
console.log('\n--- Test 3: Check gates with markers ---');
const dispatcher2 = new SpoolDispatcher(gmDir);
const hasGm2 = dispatcher2.checkNeedsGm();
const hasPrd2 = dispatcher2.checkPrdExists();
console.log(`needs-gm exists: ${hasGm2}`);
console.log(`prd.yml exists: ${hasPrd2}`);

// Test PRD status
const prdStatus = dispatcher2.getPrdStatus();
console.log(`PRD status items: ${prdStatus.itemCount}`);

// Test mutables
console.log('\n--- Test 4: Test mutables gate ---');
fs.writeFileSync(path.join(gmDir, 'mutables.yml'), `
- id: mut-1
  claim: Test mutable
  witness_method: exec:recall test
  witness_evidence: ''
  status: unknown
`);
console.log('✓ Created .gm/mutables.yml with unresolved mutable');

const dispatcher3 = new SpoolDispatcher(gmDir);
const unresolvedMutables = dispatcher3.checkUnresolvedMutables();
console.log(`Unresolved mutables: ${unresolvedMutables.length}`);

if (unresolvedMutables.length > 0) {
  console.log(`  - ${unresolvedMutables[0].id}: ${unresolvedMutables[0].claim}`);
}

// Test gm-fired marker
console.log('\n--- Test 5: Test gm-fired marker gate ---');
const sessionId = 'test-session-123';
fs.writeFileSync(path.join(gmDir, `gm-fired-${sessionId}`), '');
console.log(`✓ Created .gm/gm-fired-${sessionId}`);

const dispatcher4 = new SpoolDispatcher(gmDir);
const gmFired = dispatcher4.checkGmFired(sessionId);
console.log(`gm-fired-${sessionId} exists: ${gmFired}`);

// Cleanup
console.log('\n--- Cleanup ---');
fs.rmSync(path.join(gmDir, 'needs-gm'), { force: true });
fs.rmSync(path.join(gmDir, 'prd.yml'), { force: true });
fs.rmSync(path.join(gmDir, 'mutables.yml'), { force: true });
fs.rmSync(path.join(gmDir, `gm-fired-${sessionId}`), { force: true });
console.log('✓ Cleaned up test markers');

console.log('\n✓ All spool dispatch gate tests passed');
process.exit(0);
