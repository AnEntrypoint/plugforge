const { execSync } = require('child_process');

try {
  console.log('[test-bun-gm-gc] Testing bun x gm-gc@latest...');

  // Check if bun is available
  try {
    const bunVersion = execSync('bun --version 2>&1', {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 5000,
      shell: 'powershell'
    });
    console.log(`[test-bun-gm-gc] ✓ bun available: ${bunVersion.trim()}`);
  } catch (e) {
    console.log(`[test-bun-gm-gc] ✗ bun not available: ${e.message.substring(0, 100)}`);
    process.exit(1);
  }

  // Try to run bun x gm-gc@latest --help
  console.log('[test-bun-gm-gc] Running: bun x gm-gc@latest --help');
  try {
    const helpOutput = execSync('bun x gm-gc@latest --help 2>&1', {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 30000,
      shell: 'powershell',
      maxBuffer: 10 * 1024 * 1024
    });
    console.log(`[test-bun-gm-gc] ✓ Help output received (${helpOutput.length} bytes)`);
    console.log('[test-bun-gm-gc] --- Output ---');
    console.log(helpOutput.substring(0, 1000));
    if (helpOutput.length > 1000) {
      console.log(`... (${helpOutput.length - 1000} more bytes)`);
    }
  } catch (e) {
    console.log(`[test-bun-gm-gc] ✗ Failed: ${e.message.substring(0, 200)}`);
    if (e.stderr) {
      console.log('[test-bun-gm-gc] Stderr:', e.stderr.toString().substring(0, 500));
    }
    if (e.stdout) {
      console.log('[test-bun-gm-gc] Stdout:', e.stdout.toString().substring(0, 500));
    }
    process.exit(1);
  }

  console.log('[test-bun-gm-gc] Test complete');
} catch (e) {
  console.error('[test-bun-gm-gc] Error:', e.message);
  process.exit(1);
}
