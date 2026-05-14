const fs = require('fs');
const path = require('path');

const spoolPath = path.join(process.cwd(), 'gm-skill', 'index.js');

console.log(`CRITERION 5: Spool helpers accessible`);

if (!fs.existsSync(spoolPath)) {
  console.log(`gm-skill/index.js: NOT FOUND`);
  console.log(`CRITERION 5 PASS: false`);
  process.exit(1);
}

const spoolCode = fs.readFileSync(spoolPath, 'utf8');
const hasWriteSpool = spoolCode.includes('writeSpool');
const hasReadSpoolOutput = spoolCode.includes('readSpoolOutput');
const hasWaitForCompletion = spoolCode.includes('waitForCompletion');

console.log(`gm-skill/index.js exists: YES`);
console.log(`  writeSpool export: ${hasWriteSpool ? 'YES' : 'NO'}`);
console.log(`  readSpoolOutput export: ${hasReadSpoolOutput ? 'YES' : 'NO'}`);
console.log(`  waitForCompletion export: ${hasWaitForCompletion ? 'YES' : 'NO'}`);

const pass = hasWriteSpool && hasReadSpoolOutput && hasWaitForCompletion;
console.log(`\nCRITERION 5 PASS: ${pass}`);
