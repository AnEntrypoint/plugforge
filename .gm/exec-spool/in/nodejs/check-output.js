const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';

if (!fs.existsSync(outDir)) {
  console.log('Output directory does not exist yet');
  process.exit(0);
}

const files = fs.readdirSync(outDir);
console.log('Files in output directory:', files);

// Look for stage7-regen files
const stage7Files = files.filter(f => f.includes('stage7-regen'));
console.log('Stage 7 files:', stage7Files);

if (files.includes('stage7-regen.json')) {
  const meta = JSON.parse(fs.readFileSync(path.join(outDir, 'stage7-regen.json'), 'utf-8'));
  console.log('Task metadata:', JSON.stringify(meta, null, 2));

  if (meta.exitCode === 0) {
    const stdout = fs.readFileSync(path.join(outDir, 'stage7-regen.out'), 'utf-8');
    console.log('\n=== STDOUT ===\n', stdout.slice(-2000)); // Last 2000 chars
  } else {
    const stderr = fs.readFileSync(path.join(outDir, 'stage7-regen.err'), 'utf-8');
    console.log('\n=== STDERR ===\n', stderr.slice(-2000));
  }
} else {
  console.log('Stage 7 task not yet complete. Recent files:', files.slice(-5));
}
