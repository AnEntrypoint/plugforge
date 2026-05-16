const fs = require('fs');
const path = require('path');

console.log('=== Checking for local platform repos ===\n');

const devDir = 'C:\\dev';
const expectedRepos = [
  'gm-cc',
  'gm-gc',
  'gm-oc',
  'gm-kilo',
  'gm-codex',
  'gm-qwen',
  'gm-hermes',
  'gm-thebird',
  'gm-vscode',
  'gm-cursor',
  'gm-zed',
  'gm-jetbrains',
  'gm-copilot-cli',
  'gm-antigravity',
  'gm-windsurf'
];

const items = fs.readdirSync(devDir);
const foundRepos = expectedRepos.filter(repo => items.includes(repo));

console.log(`Checking ${devDir}...\n`);

if (foundRepos.length === 0) {
  console.log('✗ No platform repos found locally');
  console.log('\nTo clone all platforms:');
  console.log('  git clone https://github.com/AnEntrypoint/gm-cc C:\\dev\\gm-cc');
  console.log('  git clone https://github.com/AnEntrypoint/gm-gc C:\\dev\\gm-gc');
  console.log('  ... (repeat for each of 15 platforms)');
  process.exit(0);
}

console.log(`Found ${foundRepos.length} local platform repos:\n`);

foundRepos.forEach(repo => {
  const repoPath = path.join(devDir, repo);
  const hasHooks = fs.existsSync(path.join(repoPath, 'hooks'));
  const hasDaemonBootstrap = fs.existsSync(path.join(repoPath, 'lib', 'daemon-bootstrap.js'));
  const hasSpoolDispatch = fs.existsSync(path.join(repoPath, 'lib', 'spool-dispatch.js'));

  console.log(`${repo}:`);
  if (hasHooks) {
    console.log(`  ✗ Still has hooks/ (not updated)`);
  } else {
    console.log(`  ✓ No hooks/ (spool-dispatch ready)`);
  }
  console.log(`  daemon-bootstrap: ${hasDaemonBootstrap ? '✓' : '✗'}`);
  console.log(`  spool-dispatch: ${hasSpoolDispatch ? '✓' : '✗'}`);
});

console.log(`\nVerification complete for ${foundRepos.length} repos.`);
