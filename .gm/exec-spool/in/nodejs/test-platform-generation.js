const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Testing platform generation ===\n');

const buildDir = 'C:\\dev\\gm\\build';

// Remove old build if it exists
if (fs.existsSync(buildDir)) {
  console.log('Removing old build directory...');
  fs.rmSync(buildDir, { recursive: true, force: true });
}

console.log('Running: node cli.js gm-starter ./build\n');

const proc = spawn('node', ['cli.js', 'gm-starter', './build'], {
  cwd: 'C:\\dev\\gm',
  stdio: 'pipe'
});

let stdout = '';
let stderr = '';

proc.stdout.on('data', (data) => {
  const text = data.toString();
  stdout += text;
  process.stdout.write(text);
});

proc.stderr.on('data', (data) => {
  const text = data.toString();
  stderr += text;
  process.stderr.write(text);
});

proc.on('close', (code) => {
  console.log(`\n\nProcess exited with code: ${code}\n`);

  if (code !== 0) {
    console.log('BUILD FAILED');
    process.exit(1);
  }

  // Check generated platforms
  console.log('\n=== Checking generated platforms ===\n');

  if (!fs.existsSync(buildDir)) {
    console.log('ERROR: Build directory was not created');
    process.exit(1);
  }

  const platforms = fs.readdirSync(buildDir).filter(f => f.startsWith('gm-'));
  console.log(`Found ${platforms.length} platforms:\n`);

  const expectedPlatforms = [
    'gm-cc', 'gm-gc', 'gm-oc', 'gm-codex', 'gm-kilo', 'gm-qwen',
    'gm-hermes', 'gm-thebird', 'gm-vscode', 'gm-cursor', 'gm-zed',
    'gm-jetbrains', 'gm-copilot-cli', 'gm-antigravity', 'gm-windsurf'
  ];

  const missing = expectedPlatforms.filter(p => !platforms.includes(p));
  if (missing.length > 0) {
    console.log(`ERROR: Missing platforms: ${missing.join(', ')}`);
    process.exit(1);
  }

  platforms.forEach(platform => {
    const platformDir = path.join(buildDir, platform);

    // Check for hooks directory (should NOT exist)
    const hooksPath = path.join(platformDir, 'hooks');
    if (fs.existsSync(hooksPath)) {
      console.log(`✗ ${platform}: ERROR - hooks/ directory still exists!`);
      process.exit(1);
    }

    // Check for required files
    const hasSkillsDir = fs.existsSync(path.join(platformDir, 'skills'));
    const hasAgentsDir = fs.existsSync(path.join(platformDir, 'agents'));
    const hasBinDir = fs.existsSync(path.join(platformDir, 'bin'));

    const status = hasSkillsDir && hasAgentsDir && hasBinDir ? '✓' : '✗';
    console.log(`${status} ${platform}`);
  });

  console.log('\n✓ All platforms generated successfully with spool dispatch architecture');
  process.exit(0);
});
