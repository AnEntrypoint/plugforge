const { execSync } = require('child_process');
const path = require('path');

try {
  process.chdir('/c/dev/gm');

  console.log('=== Staging test.js and package.json ===');
  execSync('git add test.js package.json', { stdio: 'inherit' });

  console.log('\n=== Committing changes ===');
  const msg = 'fix: add js-yaml dependency and correct test assertions for case sensitivity and hooks structure';
  execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });

  console.log('\n=== Checking status ===');
  execSync('git status --short', { stdio: 'inherit' });

  console.log('\n=== Pushing to origin/main ===');
  execSync('git push origin main', { stdio: 'inherit' });

  console.log('\n=== Verifying push succeeded ===');
  const log = execSync('git log --oneline -1', { encoding: 'utf8' });
  console.log('Latest commit:', log);

  process.exit(0);
} catch (e) {
  console.error('COMMIT/PUSH FAILED:', e.message);
  process.exit(1);
}
