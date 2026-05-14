const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.join(process.cwd(), '.gm', 'exec-spool', 'out');
const inDir = path.join(process.cwd(), '.gm', 'exec-spool', 'in', 'nodejs');

let allComplete = true;
const results = {};

for (const id of [100, 101, 102]) {
  const jsonFile = path.join(outDir, `${id}.json`);
  const outFile = path.join(outDir, `${id}.out`);

  if (fs.existsSync(jsonFile)) {
    const meta = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    results[id] = { status: 'done', exitCode: meta.exitCode };
    if (meta.exitCode !== 0) allComplete = false;
    if (fs.existsSync(outFile)) {
      const output = fs.readFileSync(outFile, 'utf8');
      results[id].lastLine = output.split('\n').filter(Boolean).pop();
    }
  } else {
    results[id] = { status: 'pending' };
    allComplete = false;
  }
}

console.log('Scaffold file status:');
console.log(JSON.stringify(results, null, 2));

if (!allComplete) {
  console.log('\nNot all files complete yet. Waiting...');
  process.exit(1);
}

console.log('\nAll files complete with exit 0. Checking gm-skill repo...');

try {
  const repoCheck = execSync('gh repo view AnEntrypoint/gm-skill --json nameWithOwner,createdAt', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  console.log('gm-skill repo exists:');
  console.log(repoCheck);
} catch (e) {
  console.log('gm-skill repo check failed (may not exist yet)');
}
