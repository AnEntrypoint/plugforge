const fs = require('fs');
const path = require('path');

const spoolDir = 'C:\\dev\\gm\\.gm\\exec-spool';
const inDir = path.join(spoolDir, 'in');
const outDir = path.join(spoolDir, 'out');

console.log(`\nChecking spool structure...`);
console.log(`In dir exists: ${fs.existsSync(inDir)}`);
console.log(`Out dir exists: ${fs.existsSync(outDir)}`);

if (fs.existsSync(inDir)) {
  const inFiles = fs.readdirSync(inDir);
  console.log(`\nIn directory (${inFiles.length} items):`);
  inFiles.forEach(item => {
    const itemPath = path.join(inDir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      const subfiles = fs.readdirSync(itemPath);
      console.log(`  ${item}/ (${subfiles.length} items): ${subfiles.join(', ')}`);
    } else {
      console.log(`  ${item} (${stat.size}B)`);
    }
  });
}

if (fs.existsSync(outDir)) {
  const outFiles = fs.readdirSync(outDir);
  console.log(`\nOut directory (${outFiles.length} items):`);
  outFiles.slice(0, 20).forEach(item => {
    const itemPath = path.join(outDir, item);
    const stat = fs.statSync(itemPath);
    console.log(`  ${item} (${stat.size}B)`);
  });
  if (outFiles.length > 20) {
    console.log(`  ... and ${outFiles.length - 20} more`);
  }

  const jsonFiles = outFiles.filter(f => f.endsWith('.json')).sort();
  if (jsonFiles.length > 0) {
    const lastJson = jsonFiles[jsonFiles.length - 1];
    console.log(`\nMost recent result: ${lastJson}`);
    const metadata = JSON.parse(fs.readFileSync(path.join(outDir, lastJson), 'utf8'));
    console.log(`  exitCode: ${metadata.exitCode}, ok: ${metadata.ok}`);
  }
}
