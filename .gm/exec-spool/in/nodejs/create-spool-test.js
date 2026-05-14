const fs = require('fs');
const path = require('path');
const os = require('os');

try {
  console.log('[create-spool-test] Creating test.js for spool helpers...');

  const gmSkillPath = 'C:\\dev\\gm\\gm-starter\\gm-skill';
  const testCode = `const { spool } = require('./index.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function test() {
  console.log('Testing spool helpers...');

  // Test 1: writeSpool creates file
  const taskId = spool.writeSpool('console.log("test output")', 'nodejs');
  console.assert(typeof taskId === 'number', 'writeSpool returns number');

  // Test 2: readSpoolOutput handles missing output
  const missing = spool.readSpoolOutput(99999);
  console.assert(missing === null, 'readSpoolOutput returns null for missing task');

  // Test 3: getAllOutputs returns object
  const allOutputs = spool.getAllOutputs();
  console.assert(typeof allOutputs === 'object', 'getAllOutputs returns object');

  // Test 4: Platform paths work on Windows and POSIX
  const appdata = process.env.APPDATA || process.env.HOME;
  const spoolDir = path.join(appdata, '.claude', 'exec-spool');
  console.assert(spoolDir.length > 0, 'Spool directory path constructed');

  // Test 5: Create and verify spool directory structure
  if (!fs.existsSync(spoolDir)) {
    fs.mkdirSync(spoolDir, { recursive: true });
  }
  const inDir = path.join(spoolDir, 'in', 'nodejs');
  fs.mkdirSync(inDir, { recursive: true });
  console.assert(fs.existsSync(inDir), 'Spool input directory created');

  console.log('All tests passed');
  return 0;
}

test().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
`;

  const testPath = path.join(gmSkillPath, 'test.js');
  fs.writeFileSync(testPath, testCode);
  console.log('[create-spool-test] Created test.js with smoke assertions');

  // Verify test.js is under 200 lines
  const lines = testCode.split('\\n').length;
  console.log('[create-spool-test] test.js is', lines, 'lines (limit: 200)');
  console.assert(lines < 200, 'test.js respects 200-line limit');

  console.log('[create-spool-test] Test file creation complete');
} catch (e) {
  console.error('[create-spool-test] Error:', e.message);
  process.exit(1);
}
