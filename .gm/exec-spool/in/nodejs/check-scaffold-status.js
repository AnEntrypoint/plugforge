const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), '.gm', 'exec-spool', 'out');
const inDir = path.join(process.cwd(), '.gm', 'exec-spool', 'in', 'nodejs');

for (const id of [100, 101, 102]) {
  const outFile = path.join(outDir, `${id}.json`);
  const inFile = path.join(inDir, `${id}.js`);

  const inExists = fs.existsSync(inFile);
  const outExists = fs.existsSync(outFile);

  console.log(`File ${id}: in=${inExists ? 'queued' : 'absent'}, out=${outExists ? 'done' : 'pending'}`);

  if (outExists) {
    const meta = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    console.log(`  exit=${meta.exitCode}, duration=${meta.durationMs}ms`);
  }
}

console.log('\nRecent out/ files:');
const files = fs.readdirSync(outDir).filter(f => f.endsWith('.json')).sort((a, b) => {
  const aNum = parseInt(a);
  const bNum = parseInt(b);
  return bNum - aNum;
}).slice(0, 5);

for (const f of files) {
  const meta = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
  console.log(`${f}: exit=${meta.exitCode}`);
}
