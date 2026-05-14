const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';

// List all files in output directory
const allFiles = fs.readdirSync(outDir).sort();
console.log(`[find-validation-outputs] Total files in out/: ${allFiles.length}`);
console.log('Recent files:');
allFiles.slice(-30).forEach(f => console.log(`  ${f}`));

// Count by type
const counts = {
  out: 0,
  err: 0,
  json: 0
};

allFiles.forEach(f => {
  if (f.endsWith('.out')) counts.out++;
  else if (f.endsWith('.err')) counts.err++;
  else if (f.endsWith('.json')) counts.json++;
});

console.log(`\nSummary: ${counts.out} .out files, ${counts.err} .err files, ${counts.json} .json (completed) files`);

// Try to find any validation test outputs
console.log('\nSearching for validation test outputs...');
const jsonFiles = allFiles.filter(f => f.endsWith('.json')).map(f => parseInt(f.split('.')[0]));

if (jsonFiles.length > 0) {
  const lastCompleted = Math.max(...jsonFiles);
  console.log(`Last completed task ID: ${lastCompleted}`);

  // Read and display the last few outputs
  for (let i = Math.max(lastCompleted - 2, 0); i <= lastCompleted; i++) {
    const outFile = path.join(outDir, `${i}.out`);
    const jsonFile = path.join(outDir, `${i}.json`);

    if (fs.existsSync(jsonFile)) {
      const meta = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      console.log(`\n=== Task ${i} (${meta.lang}, exit ${meta.exitCode}) ===`);

      if (fs.existsSync(outFile)) {
        const out = fs.readFileSync(outFile, 'utf8');
        console.log(out.substring(0, 800));
      }
    }
  }
}
