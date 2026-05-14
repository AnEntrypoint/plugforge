const { execSync } = require('child_process');

try {
  process.chdir('C:\\dev\\gm');

  // Verify git is clean
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  const lines = status.split('\n').filter(l => l && !l.startsWith('??'));

  if (lines.length > 0) {
    console.log('WARNING: uncommitted changes remain:');
    console.log(lines.join('\n'));
    process.exit(1);
  }

  // Verify last commit message
  const lastCommit = execSync('git log -1 --pretty=%B', { encoding: 'utf8' });
  if (!lastCommit.includes('daemon-bootstrap')) {
    console.error('ERROR: daemon-bootstrap not in last commit');
    process.exit(1);
  }

  // Verify files are in HEAD
  const files = [
    'gm-starter/lib/daemon-bootstrap.js',
    'platforms/cli-config-shared.js',
    'package-lock.json'
  ];
  for (const f of files) {
    try {
      execSync(`git show HEAD:${f}`, { stdio: 'pipe' });
    } catch (e) {
      console.error(`ERROR: ${f} not in HEAD`);
      process.exit(1);
    }
  }

  console.log('✓ Commit verified');
  console.log('✓ Files in git');
  console.log('✓ Working tree clean');

} catch (e) {
  console.error('Verification failed:', e.message);
  process.exit(1);
}
