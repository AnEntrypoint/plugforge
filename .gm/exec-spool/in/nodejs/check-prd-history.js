const fs = require('fs');
const path = require('path');

const gmDir = 'C:\\dev\\gm\\.gm';

console.log('[check-prd-history] Checking for PRD and mutable tracking files\n');

const files = [
  'prd.yml',
  'mutables.yml',
  'prd-state.json',
  'turn-state.json',
  'lastskill'
];

files.forEach(f => {
  const filePath = path.join(gmDir, f);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    console.log(`${f}: exists (${stat.size} bytes, modified ${stat.mtimeMs})`);
  } else {
    console.log(`${f}: not found`);
  }
});

// Check for any backup files
console.log('\n[check-prd-history] Looking for backup/previous files:');
const allFiles = fs.readdirSync(gmDir);
const relevant = allFiles.filter(f => f.includes('prd') || f.includes('state') || f.includes('mutable'));
relevant.forEach(f => console.log(`  ${f}`));

// Check git log to see what was committed
console.log('\n[check-prd-history] Recent git history in .gm/:');
// We'd need to run git, so just note that
console.log('  (Would need git log to show history)');
