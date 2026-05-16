const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';
const files = fs.readdirSync(outDir);

// Find the cargo-check output (should be one of the highest numbered files)
const numbers = files
  .filter(f => f.endsWith('.json') || f.endsWith('.out') || f.endsWith('.err'))
  .map(f => parseInt(f.split('.')[0]))
  .sort((a, b) => b - a);

if (numbers.length === 0) {
  console.log('No output files yet. Waiting for spool to execute...');
  process.exit(0);
}

const latestNum = numbers[0];
const outFile = path.join(outDir, `${latestNum}.out`);
const errFile = path.join(outDir, `${latestNum}.err`);
const jsonFile = path.join(outDir, `${latestNum}.json`);

console.log(`\n=== Latest spool task output (task ${latestNum}) ===\n`);

if (fs.existsSync(jsonFile)) {
  const meta = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log('Metadata:', meta);
}

if (fs.existsSync(outFile)) {
  console.log('\n--- STDOUT ---');
  const out = fs.readFileSync(outFile, 'utf8');
  const lines = out.split('\n');
  console.log(lines.slice(0, 50).join('\n'));
  if (lines.length > 50) console.log(`... (${lines.length - 50} more lines)`);
}

if (fs.existsSync(errFile)) {
  console.log('\n--- STDERR ---');
  const err = fs.readFileSync(errFile, 'utf8');
  const lines = err.split('\n');
  console.log(lines.slice(0, 50).join('\n'));
  if (lines.length > 50) console.log(`... (${lines.length - 50} more lines)`);
}
