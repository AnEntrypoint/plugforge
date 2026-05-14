const fs = require('fs');
const path = require('path');
const os = require('os');

async function waitForTests() {
  const spoolDir = path.join(os.homedir(), '.claude', 'exec-spool');
  const outDir = path.join(spoolDir, 'out');

  // Expected test task IDs
  const expectedTests = ['test-gm-gc-structure', 'test-gm-gc-integration', 'test-gm-gc-gemini', 'test-feature-parity'];

  console.log('[await-tests] Waiting for test tasks to complete...');
  console.log(`[await-tests] Expecting: ${expectedTests.join(', ')}`);

  // Wait up to 30 seconds for test completion
  const startTime = Date.now();
  const timeoutMs = 30000;

  while (Date.now() - startTime < timeoutMs) {
    const files = fs.readdirSync(outDir).filter(f => f.endsWith('.json')).sort();
    const latestId = files.length > 0 ? parseInt(files[files.length - 1].split('.')[0]) : 0;

    console.log(`[await-tests] Latest task ID: ${latestId}, elapsed: ${Date.now() - startTime}ms`);

    // Check if recent output files contain test results
    const recentJsons = files.slice(-10);
    const testOutputs = recentJsons.filter(f => {
      const outFile = path.join(outDir, f.replace('.json', '.out'));
      if (!fs.existsSync(outFile)) return false;
      const content = fs.readFileSync(outFile, 'utf8');
      return expectedTests.some(test => content.includes(`[${test.split('-').slice(1).join('-')}]`));
    });

    if (testOutputs.length >= 2) {
      console.log(`[await-tests] Found ${testOutputs.length} test outputs, reading results...`);

      testOutputs.forEach(jsonFile => {
        const outFile = path.join(outDir, jsonFile.replace('.json', '.out'));
        if (fs.existsSync(outFile)) {
          const output = fs.readFileSync(outFile, 'utf8');
          console.log(`\n[await-tests] --- ${jsonFile} ---`);
          // Print first 1000 chars and last 500 chars
          if (output.length > 1500) {
            console.log(output.substring(0, 1000));
            console.log('\n... (output truncated) ...\n');
            console.log(output.substring(output.length - 500));
          } else {
            console.log(output);
          }
        }
      });

      break;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('[await-tests] Done waiting');
}

waitForTests().catch(e => {
  console.error('[await-tests] Error:', e.message);
  process.exit(1);
});
