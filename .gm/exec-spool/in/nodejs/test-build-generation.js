const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Testing Platform Build Generation ===\n');

const gmDir = 'C:\\dev\\gm';
const buildDir = path.join(gmDir, 'build');
const cliFile = path.join(gmDir, 'cli.js');

if (!fs.existsSync(cliFile)) {
  console.log('✗ cli.js not found');
  process.exit(1);
}

console.log('✓ cli.js exists');
console.log('Starting build generation...\n');

// Check if build directory exists and is stale
if (fs.existsSync(buildDir)) {
  console.log('Removing existing build directory...');
  try {
    fs.rmSync(buildDir, { recursive: true, force: true });
    console.log('✓ Old build cleaned\n');
  } catch (e) {
    console.log(`✗ Failed to clean build: ${e.message}`);
    process.exit(1);
  }
}

// Run build generation
const child = spawn('node', ['cli.js', 'gm-starter', './build'], {
  cwd: gmDir,
  stdio: 'pipe',
  shell: true,
  timeout: 120000
});

let output = '';
let errorOutput = '';

child.stdout.on('data', (data) => {
  output += data.toString();
  process.stdout.write(`[build] ${data}`);
});

child.stderr.on('data', (data) => {
  errorOutput += data.toString();
  process.stderr.write(`[build] ${data}`);
});

child.on('close', (code) => {
  console.log(`\n--- Build completed with exit code ${code} ---\n`);

  if (code !== 0) {
    console.log(`✗ Build failed`);
    process.exit(1);
  }

  if (!fs.existsSync(buildDir)) {
    console.log(`✗ Build directory not created`);
    process.exit(1);
  }

  console.log('✓ Build generated successfully\n');

  // Count platforms
  const platforms = fs.readdirSync(buildDir).filter(f => f.startsWith('gm-'));
  console.log(`Generated ${platforms.length} platforms:\n`);

  let hasErrors = false;

  platforms.forEach(platform => {
    const platformDir = path.join(buildDir, platform);
    const hooksDir = path.join(platformDir, 'hooks');
    const daemonBootstrapPath = path.join(platformDir, 'lib', 'daemon-bootstrap.js');
    const spoolDispatchPath = path.join(platformDir, 'lib', 'spool-dispatch.js');

    console.log(`  ${platform}`);

    if (fs.existsSync(hooksDir)) {
      console.log(`    ✗ hooks/ directory exists (ERROR)`);
      hasErrors = true;
    } else {
      console.log(`    ✓ No hooks/ (spool-dispatch ready)`);
    }

    if (fs.existsSync(daemonBootstrapPath)) {
      console.log(`    ✓ daemon-bootstrap.js`);
    } else {
      console.log(`    ⚠ daemon-bootstrap.js missing`);
    }

    if (fs.existsSync(spoolDispatchPath)) {
      console.log(`    ✓ spool-dispatch.js`);
    } else {
      console.log(`    ⚠ spool-dispatch.js missing`);
    }
  });

  console.log(`\n--- Summary ---`);
  if (hasErrors) {
    console.log('✗ Build validation failed: some platforms have hooks/');
    process.exit(1);
  } else {
    console.log(`✓ All ${platforms.length} platforms validated`);
    console.log('✓ No hook artifacts found');
    console.log('✓ Build generation passed');
    process.exit(0);
  }
});

child.on('error', (err) => {
  console.log(`✗ Build process error: ${err.message}`);
  process.exit(1);
});
