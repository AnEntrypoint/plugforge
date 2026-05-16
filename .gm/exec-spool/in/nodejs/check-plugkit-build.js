const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Running cargo check for rs-plugkit...');
  const result = execSync('cd C:\\dev\\rs-plugkit && cargo check 2>&1', {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120000
  });

  console.log(result);

  if (result.includes('error') && !result.includes('warning')) {
    console.error('Build failed');
    process.exit(1);
  } else if (result.includes('Finished')) {
    console.log('\n✓ Build succeeded');
    process.exit(0);
  } else {
    console.log('\n? Build status unclear - check output above');
    process.exit(0);
  }
} catch (err) {
  console.error('Build error:', err.message);
  console.error('stderr:', err.stderr?.toString());
  console.error('stdout:', err.stdout?.toString());
  process.exit(1);
}
