const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.join(process.cwd(), '.gm', 'exec-spool', 'out');

console.log('Verifying scaffold file completions...');

const allComplete = [100, 101, 102].every(id => {
  const jsonFile = path.join(outDir, `${id}.json`);
  if (!fs.existsSync(jsonFile)) return false;
  const meta = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  return meta.exitCode === 0;
});

if (!allComplete) {
  console.error('Not all scaffold files completed successfully');
  process.exit(1);
}

console.log('✓ All scaffold files completed (100, 101, 102 exit 0)');

console.log('\nVerifying gm-skill repo...');

let repoExists = false;
try {
  const result = execSync('gh repo view AnEntrypoint/gm-skill --json nameWithOwner', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  console.log(result);
  repoExists = true;
} catch (e) {
  console.log('gm-skill repo not yet visible (may be initializing)');
}

if (!repoExists) {
  console.log('Waiting for repo to be indexed...');
  process.exit(1);
}

console.log('✓ gm-skill repo exists at AnEntrypoint/gm-skill');
