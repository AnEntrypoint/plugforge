const { execSync } = require('child_process');
const path = require('path');

process.chdir('C:\\dev\\gm');

try {
  console.log('=== Stage 7: Regenerating all 12 platforms ===\n');

  const result = execSync('node cli.js gm-starter .\\build 2>&1', {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  console.log(result);

  console.log('\n=== Verifying hooks/ directories NOT created ===\n');
  const fs = require('fs');

  const platforms = [
    'build/gm-cc',
    'build/gm-gc',
    'build/gm-oc',
    'build/gm-codex',
    'build/gm-kilo',
    'build/gm-qwen',
    'build/gm-hermes',
    'build/gm-thebird',
    'build/gm-vscode',
    'build/gm-cursor',
    'build/gm-zed',
    'build/gm-jetbrains',
    'build/gm-copilot-cli',
    'build/gm-antigravity',
    'build/gm-windsurf'
  ];

  let hooksFound = false;
  platforms.forEach(platform => {
    const hooksPath = path.join(platform, 'hooks');
    if (fs.existsSync(hooksPath)) {
      console.log(`FAIL: hooks/ exists in ${platform}`);
      hooksFound = true;
    } else {
      console.log(`✓ No hooks/ in ${platform}`);
    }
  });

  if (!hooksFound) {
    console.log('\n✓ All platforms verified: no hooks/ directories created');
  } else {
    console.log('\nERROR: hooks/ directories found in generated platforms');
    process.exit(1);
  }

  console.log('\n=== Verifying skills/, agents/, scripts/ created ===\n');

  let success = 0;
  platforms.forEach(platform => {
    const hasSkilsDir = fs.existsSync(path.join(platform, 'skills'));
    const hasAgentsDir = fs.existsSync(path.join(platform, 'agents'));
    const hasScriptsDir = fs.existsSync(path.join(platform, 'scripts'));

    if (hasSkilsDir && hasAgentsDir && hasScriptsDir) {
      console.log(`✓ ${platform}: skills/, agents/, scripts/ present`);
      success++;
    } else {
      console.log(`FAIL ${platform}: missing directories`);
    }
  });

  console.log(`\n✓ ${success}/${platforms.length} platforms have required directories`);

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
