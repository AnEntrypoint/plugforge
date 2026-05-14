const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

try {
  const pkgPath = '/c/dev/gm/package.json';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (!pkg.dependencies || !pkg.dependencies['js-yaml']) {
    console.error('ERROR: package.json missing js-yaml dependency');
    process.exit(1);
  }

  const testPath = '/c/dev/gm/test.js';
  const test = fs.readFileSync(testPath, 'utf8');

  if (!test.includes('toLowerCase()')) {
    console.error('ERROR: test.js missing toLowerCase() edit');
    process.exit(1);
  }

  if (!test.includes('Object.keys(hooks.hooks)')) {
    console.error('ERROR: test.js missing Object.keys() edit');
    process.exit(1);
  }

  console.log('✓ All edits in place, committing...');
  execSync('git add package.json test.js', { stdio: 'inherit', cwd: '/c/dev/gm' });
  execSync('git commit -m "fix: add js-yaml dependency and correct test assertions"', { stdio: 'inherit', cwd: '/c/dev/gm' });
  console.log('Commit successful');
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
