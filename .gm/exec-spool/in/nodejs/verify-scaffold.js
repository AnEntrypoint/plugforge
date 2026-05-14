const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== VERIFY: gm-skill repo structure and commits ===\n');

try {
  const repoPath = 'C:\\Users\\user\\code\\repos\\gm-skill';

  console.log('[1] Verify repo exists...');
  if (!fs.existsSync(repoPath)) {
    console.error('✗ Repo not found at ' + repoPath);
    process.exit(1);
  }
  console.log('    ✓ Repo found at ' + repoPath);

  console.log('[2] Verify git status...');
  process.chdir(repoPath);
  const status = execSync('git status --porcelain 2>&1', { encoding: 'utf8' }).trim();
  if (status && !status.includes('fatal')) {
    console.error('✗ Uncommitted changes exist:');
    console.error(status);
    process.exit(1);
  }
  console.log('    ✓ Working tree clean');

  console.log('[3] Verify initial files...');
  const requiredFiles = ['README.md', 'package.json', '.gitignore'];
  for (const file of requiredFiles) {
    const filePath = path.join(repoPath, file);
    if (!fs.existsSync(filePath)) {
      console.error('✗ Missing required file: ' + file);
      process.exit(1);
    }
    console.log('    ✓ ' + file);
  }

  console.log('[4] Verify git log...');
  const log = execSync('git log --oneline 2>&1', { encoding: 'utf8' }).trim();
  if (!log || log.includes('fatal')) {
    console.error('✗ No commits in repo');
    process.exit(1);
  }
  console.log('    ✓ Commits found:');
  log.split('\n').slice(0, 3).forEach(line => {
    if (line) console.log('      ' + line);
  });

  console.log('\n✓ VERIFY COMPLETE: repo structure valid');
  process.exit(0);

} catch (e) {
  console.error('✗ VERIFY FAILED:', e.message);
  process.exit(1);
}
