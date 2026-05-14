const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.join(process.cwd(), '.gm', 'exec-spool', 'out');
const prdPath = path.join(process.cwd(), '.gm', 'prd.yml');

console.log('Verifying scaffold completion...');

const allComplete = [100, 101, 102].every(id => {
  const jsonFile = path.join(outDir, id + '.json');
  if (!fs.existsSync(jsonFile)) {
    console.log('Missing output file: ' + id + '.json');
    return false;
  }
  const meta = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  if (meta.exitCode !== 0) {
    console.log('File ' + id + ' exit code: ' + meta.exitCode);
    return false;
  }
  return true;
});

if (!allComplete) {
  console.error('Scaffold files not all complete');
  process.exit(1);
}

console.log('All scaffold files complete.');

console.log('Verifying gm-skill repo...');
try {
  const result = execSync('gh repo view AnEntrypoint/gm-skill --json url', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  console.log('gm-skill repo verified: ' + result.trim());
} catch (e) {
  console.error('gm-skill repo verification failed');
  process.exit(1);
}

console.log('Deleting PRD file...');
if (fs.existsSync(prdPath)) {
  fs.unlinkSync(prdPath);
  console.log('PRD deleted');
} else {
  console.log('PRD already absent');
}

console.log('Scaffold execution complete. Ready for residual scan.');
