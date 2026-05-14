const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

try {
  console.log('[install-test] Starting gm-gc installation and testing...');

  // 1. Build gm-gc if not already built
  const buildDir = 'C:\\dev\\gm\\build';
  const gmGcPath = path.join(buildDir, 'gm-gc');

  if (!fs.existsSync(gmGcPath)) {
    console.log('[install-test] Building gm-gc from gm-starter...');
    try {
      execSync('node cli.js gm-starter C:\\dev\\gm\\build', {
        cwd: 'C:\\dev\\gm',
        stdio: 'pipe',
        timeout: 120000,
        encoding: 'utf8'
      });
      console.log('[install-test] Build completed');
    } catch (e) {
      console.log('[install-test] Build output:', e.stdout?.substring(0, 500) || e.message.substring(0, 500));
    }
  }

  if (fs.existsSync(gmGcPath)) {
    console.log('[install-test] gm-gc built successfully');
    const pkgJson = JSON.parse(fs.readFileSync(path.join(gmGcPath, 'package.json'), 'utf8'));
    console.log('[install-test] Package:', pkgJson.name, 'v' + pkgJson.version);

    // Check for executable
    const binPath = path.join(gmGcPath, 'bin', 'gm-gc.js');
    if (fs.existsSync(binPath)) {
      console.log('[install-test] Executable found at:', binPath);
    }

    // Test with node
    console.log('[install-test] Testing gm-gc help...');
    try {
      const help = execSync(`node "${binPath}" --help`, {
        stdio: 'pipe',
        timeout: 10000,
        encoding: 'utf8'
      });
      console.log('[install-test] Help output (first 300 chars):');
      console.log(help.substring(0, 300));
    } catch (e) {
      console.log('[install-test] Help command error:', e.message.substring(0, 200));
    }
  } else {
    console.log('[install-test] gm-gc not found in build dir');
  }

  // 2. Test bun installation path
  console.log('[install-test] Testing bun x installation...');
  try {
    const bunVersion = execSync('bun --version', {
      stdio: 'pipe',
      timeout: 5000,
      encoding: 'utf8'
    });
    console.log('[install-test] bun available:', bunVersion.trim());

    // Try to install gm-gc via bun
    console.log('[install-test] Attempting bun x gm-gc...');
    try {
      const help = execSync('bun x gm-gc@latest --help 2>&1 | head -20', {
        shell: true,
        stdio: 'pipe',
        timeout: 30000,
        encoding: 'utf8'
      });
      console.log('[install-test] bun x help:', help.substring(0, 200));
    } catch (e) {
      console.log('[install-test] bun x gm-gc not yet published or error:', e.message.substring(0, 150));
    }
  } catch (e) {
    console.log('[install-test] bun not available:', e.message.substring(0, 100));
  }

  console.log('[install-test] Installation testing complete');
} catch (e) {
  console.error('[install-test] Error:', e.message);
  process.exit(1);
}
