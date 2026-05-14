const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';

// Task IDs for our validation tests (from prior context, these should be numbered sequentially)
const taskIds = [6, 7, 8, 9, 10, 11]; // test-bun-gm-gc, test-gm-gc-structure, test-gm-gc-integration, test-gm-gc-gemini, test-feature-parity, quick-validation

console.log('[retrieve-test-outputs] Attempting to retrieve validation test outputs\n');

taskIds.forEach(id => {
  const outFile = path.join(outDir, `${id}.out`);
  const errFile = path.join(outDir, `${id}.err`);
  const jsonFile = path.join(outDir, `${id}.json`);

  console.log(`\n=== Task ${id} ===`);

  if (fs.existsSync(jsonFile)) {
    const meta = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log(`Status: COMPLETE (exitCode: ${meta.exitCode}, duration: ${meta.durationMs}ms)`);

    if (fs.existsSync(outFile)) {
      const out = fs.readFileSync(outFile, 'utf8');
      console.log(`\nStdout (${out.length} bytes):\n${out.substring(0, 2000)}`);
      if (out.length > 2000) console.log(`... (${out.length - 2000} more bytes)`);
    }

    if (fs.existsSync(errFile)) {
      const err = fs.readFileSync(errFile, 'utf8');
      if (err.trim()) {
        console.log(`\nStderr (${err.length} bytes):\n${err.substring(0, 1000)}`);
      }
    }
  } else if (fs.existsSync(outFile)) {
    const out = fs.readFileSync(outFile, 'utf8');
    console.log(`Status: IN_PROGRESS - Partial output (${out.length} bytes)`);
  } else {
    console.log(`Status: PENDING - No output yet`);
  }
});
