const { execSync } = require('child_process');

try {
  console.log('[test-gm-gc-bun-install] Testing: bun x gm-gc@latest --help\n');

  // Check if bun is available
  try {
    const bunVersion = execSync('bun --version 2>&1', {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 5000
    });
    console.log(`[✓] bun available: ${bunVersion.trim()}`);
  } catch (e) {
    console.log(`[✗] bun not available: ${e.message.substring(0, 100)}`);
    process.exit(1);
  }

  // Try bun x gm-gc@latest --help
  console.log('\n[test-gm-gc-bun-install] Running: bun x gm-gc@latest --help');
  try {
    const helpOutput = execSync('bun x gm-gc@latest --help 2>&1', {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024
    });
    console.log(`[✓] Help output received (${helpOutput.length} bytes)`);
    console.log('\n--- Output Preview ---');
    console.log(helpOutput.substring(0, 1500));
    if (helpOutput.length > 1500) {
      console.log(`... (${helpOutput.length - 1500} more bytes)`);
    }
    console.log('--- End Preview ---');
  } catch (e) {
    console.log(`[✗] Command failed: ${e.message.substring(0, 200)}`);
    if (e.stderr) {
      console.log(`Stderr: ${e.stderr.toString().substring(0, 500)}`);
    }
    if (e.stdout) {
      console.log(`Stdout: ${e.stdout.toString().substring(0, 500)}`);
    }
    process.exit(1);
  }

  console.log('\n[test-gm-gc-bun-install] ✓ Installation test PASSED');
} catch (e) {
  console.error(`[test-gm-gc-bun-install] Error: ${e.message}`);
  process.exit(1);
}
