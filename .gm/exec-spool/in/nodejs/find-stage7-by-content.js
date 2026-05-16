const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';
const allFiles = fs.readdirSync(outDir).sort();

console.log('=== Finding stage7-regen by content ===');

// Get all .out files and search for the specific output
const outFiles = allFiles.filter(f => f.endsWith('.out')).sort().reverse();

for (const outFile of outFiles) {
  const content = fs.readFileSync(path.join(outDir, outFile), 'utf-8');

  if (content.includes('All platforms verified: no hooks/ directories created')) {
    console.log(`\nFound stage7-regen output in: ${outFile}\n`);
    console.log('=== Full Output ===\n');
    console.log(content);

    // Also read the metadata
    const baseName = outFile.replace('.out', '');
    const metaFile = baseName + '.json';
    const meta = JSON.parse(fs.readFileSync(path.join(outDir, metaFile), 'utf-8'));
    console.log('\n=== Metadata ===');
    console.log(JSON.stringify(meta, null, 2));
    break;
  }
}
