const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';

// Get all completed tasks (those with .json metadata files)
const files = fs.readdirSync(outDir).filter(f => f.endsWith('.json')).sort((a, b) => {
  const aNum = parseInt(a.split('.')[0]);
  const bNum = parseInt(b.split('.')[0]);
  return aNum - bNum;
});

console.log(`[list-and-retrieve-outputs] Found ${files.length} completed tasks\n`);

// Show the last 15 completed tasks with their outputs
files.slice(-15).forEach(jsonFile => {
  const taskId = jsonFile.split('.')[0];
  const meta = JSON.parse(fs.readFileSync(path.join(outDir, jsonFile), 'utf8'));
  const outFile = path.join(outDir, `${taskId}.out`);
  const errFile = path.join(outDir, `${taskId}.err`);

  console.log(`\n=== Task ${taskId} (lang: ${meta.lang}, exit: ${meta.exitCode}, ${meta.durationMs}ms) ===`);

  if (fs.existsSync(outFile)) {
    const out = fs.readFileSync(outFile, 'utf8');
    const preview = out.substring(0, 1500);
    console.log(preview);
    if (out.length > 1500) console.log(`... (${out.length - 1500} more bytes)`);
  }

  if (fs.existsSync(errFile)) {
    const err = fs.readFileSync(errFile, 'utf8');
    if (err.trim()) {
      console.log(`\n[STDERR] ${err.substring(0, 500)}`);
    }
  }
});
