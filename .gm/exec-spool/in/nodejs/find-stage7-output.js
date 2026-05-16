const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';
const files = fs.readdirSync(outDir).filter(f => f.startsWith('stage7') || f.includes('regen'));

console.log('Files matching stage7/regen:', files);

// Find the latest json file and read it
const jsonFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.json')).sort().reverse().slice(0, 3);
console.log('Recent JSON files:', jsonFiles);

jsonFiles.forEach(jsonFile => {
  const meta = JSON.parse(fs.readFileSync(path.join(outDir, jsonFile), 'utf-8'));
  console.log(`\nFile: ${jsonFile}`);
  console.log(`  exitCode: ${meta.exitCode}`);
  console.log(`  durationMs: ${meta.durationMs}`);

  // Get the base name
  const baseName = jsonFile.replace('.json', '');
  const outFile = path.join(outDir, baseName + '.out');

  if (fs.existsSync(outFile)) {
    const output = fs.readFileSync(outFile, 'utf-8');
    console.log(`  output size: ${output.length} bytes`);
    console.log(`  last 500 chars: ${output.slice(-500)}`);
  }
});
