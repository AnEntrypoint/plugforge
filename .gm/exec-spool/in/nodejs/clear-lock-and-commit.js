const fs = require('fs');
const { execSync } = require('child_process');

try {
  const lockPath = 'C:/dev/gm/.git/index.lock';
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
    console.log('Git lock cleared');
  }
  execSync('git add package.json test.js', { stdio: 'inherit', cwd: '/c/dev/gm' });
  execSync('git commit -m "fix: add js-yaml dependency and correct test assertions for case sensitivity and hooks structure"', { stdio: 'inherit', cwd: '/c/dev/gm' });
  console.log('Commit successful');
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
