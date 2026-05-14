const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';
const inDir = 'C:\\dev\\gm\\.gm\\exec-spool\\in';

console.log('=== SPOOL STATUS ===\n');

console.log('Output files:');
try {
  const files = fs.readdirSync(outDir).sort();
  files.forEach(f => console.log(`  ${f}`));
} catch (e) {
  console.log(`  [error reading outDir: ${e.message}]`);
}

console.log('\nInput files queued:');
try {
  const files = fs.readdirSync(inDir).sort();
  files.forEach(f => console.log(`  ${f}`));
} catch (e) {
  console.log(`  [error reading inDir: ${e.message}]`);
}

console.log('\n=== CHECK PRD STATUS ===\n');
const prdPath = 'C:\\dev\\gm\\.gm\\prd.yml';
if (fs.existsSync(prdPath)) {
  console.log('[✗] PRD file still exists (cleanup may not have run yet)');
} else {
  console.log('[✓] PRD file deleted (cleanup successful)');
}
