const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';

console.log('[read-latest-results] Reading validation test outputs\n');

// Get all JSON files (completed tasks)
const jsonFiles = fs.readdirSync(outDir)
  .filter(f => f.endsWith('.json'))
  .map(f => parseInt(f.split('.')[0]))
  .sort((a, b) => a - b);

console.log(`Total completed tasks: ${jsonFiles.length}\n`);

// Read the last 20 tasks and look for our validation markers
const recent = jsonFiles.slice(-20);
const results = {};

recent.forEach(taskId => {
  const outFile = path.join(outDir, `${taskId}.out`);
  const jsonFile = path.join(outDir, `${taskId}.json`);

  if (fs.existsSync(jsonFile)) {
    const meta = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const stdout = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';

    // Identify task
    let taskName = null;
    if (stdout.includes('[clear-blocked-prd]')) taskName = 'clear-blocked-prd';
    else if (stdout.includes('[test-gm-gc-bun-install]')) taskName = 'test-gm-gc-bun-install';
    else if (stdout.includes('[validate-gm-gc-agents]')) taskName = 'validate-gm-gc-agents';
    else if (stdout.includes('[validate-gm-gc-hooks]')) taskName = 'validate-gm-gc-hooks';
    else if (stdout.includes('[validate-gm-gc-spool]')) taskName = 'validate-gm-gc-spool';
    else if (stdout.includes('[setup-gm-gc-mutables]')) taskName = 'setup-gm-gc-mutables';
    else if (stdout.includes('[verify-prd-updated]')) taskName = 'verify-prd-updated';
    else if (stdout.includes('[collect-validation-results]')) taskName = 'collect-validation-results';

    if (taskName) {
      results[taskName] = {
        id: taskId,
        success: meta.exitCode === 0,
        durationMs: meta.durationMs,
        stdout: stdout.substring(0, 500)
      };
    }
  }
});

// Display results
console.log('Validation Task Results:');
Object.entries(results).forEach(([name, data]) => {
  const status = data.success ? '✓ PASS' : '✗ FAIL';
  console.log(`\n${status} ${name}`);
  console.log(`   Task ID: ${data.id}, Duration: ${data.durationMs}ms`);
  console.log(`   Output:\n   ${data.stdout.split('\n').slice(0, 3).join('\n   ')}`);
});

console.log(`\n\nSummary: Found ${Object.keys(results).length} validation tasks`);

// Check if PRD was updated
const prdPath = 'C:\\dev\\gm\\.gm\\prd.yml';
if (fs.existsSync(prdPath)) {
  const prdContent = fs.readFileSync(prdPath, 'utf8');
  if (prdContent.includes('validate-gm-gc-installation')) {
    console.log('[✓] PRD contains gm-gc validation items');
  } else {
    console.log('[⚠] PRD does not contain gm-gc validation items yet');
  }
} else {
  console.log('[⚠] PRD file missing');
}

// Check if mutables were added
const mutablesPath = 'C:\\dev\\gm\\.gm\\mutables.yml';
if (fs.existsSync(mutablesPath)) {
  const mutablesContent = fs.readFileSync(mutablesPath, 'utf8');
  if (mutablesContent.includes('gm-gc-bun-installation')) {
    console.log('[✓] Mutables include gm-gc validation items');
  } else {
    console.log('[⚠] Mutables do not include gm-gc items yet');
  }
}
