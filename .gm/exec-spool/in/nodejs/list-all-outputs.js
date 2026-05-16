const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';
const allFiles = fs.readdirSync(outDir).sort();

console.log('=== All files in .gm/exec-spool/out ===');
allFiles.forEach(f => {
  const fullPath = path.join(outDir, f);
  const stat = fs.statSync(fullPath);
  console.log(`${f} (${stat.size} bytes)`);
});

// Try to find which one is the stage7 by reading all .json files
console.log('\n=== JSON metadata for recent tasks ===');
const jsonFiles = allFiles.filter(f => f.endsWith('.json')).sort().reverse().slice(0, 5);

jsonFiles.forEach(jsonFile => {
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(outDir, jsonFile), 'utf-8'));
    const baseName = jsonFile.replace('.json', '');
    const outFile = path.join(outDir, baseName + '.out');

    if (fs.existsSync(outFile)) {
      const content = fs.readFileSync(outFile, 'utf-8');
      const firstLine = content.split('\n')[0];
      console.log(`${jsonFile}:`);
      console.log(`  First line: ${firstLine.substring(0, 80)}`);
    }
  } catch (e) {}
});
