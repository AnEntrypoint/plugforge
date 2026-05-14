const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== REBUILD: Regenerate all 10 platform outputs ===\n');

try {
  const cwd = 'C:\\dev\\gm';
  process.chdir(cwd);

  console.log('[1] Run node cli.js gm-starter ./build...');
  try {
    const output = execSync('node cli.js gm-starter ./build 2>&1', { encoding: 'utf8' });
    console.log(output);
    console.log('    ✓ Build command succeeded');
  } catch (e) {
    console.error('    ✗ Build failed:', e.message);
    process.exit(1);
  }

  console.log('[2] Verify build output...');
  const buildDir = path.join(cwd, 'build');
  if (!fs.existsSync(buildDir)) {
    console.error('    ✗ build/ directory not created');
    process.exit(1);
  }

  const platforms = [
    'gm-cc', 'gm-gc', 'gm-oc', 'gm-kilo', 'gm-codex', 'gm-copilot-cli',
    'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains'
  ];

  let missing = [];
  platforms.forEach(platform => {
    const platformDir = path.join(buildDir, platform);
    if (!fs.existsSync(platformDir)) {
      missing.push(platform);
    } else {
      console.log('    ✓ ' + platform);
    }
  });

  if (missing.length > 0) {
    console.error('    ✗ Missing platforms:', missing.join(', '));
    process.exit(1);
  }

  console.log('\n✓ REBUILD COMPLETE');
  console.log('  All 10 platform outputs regenerated successfully');
  process.exit(0);

} catch (e) {
  console.error('✗ REBUILD FAILED:', e.message);
  process.exit(1);
}
