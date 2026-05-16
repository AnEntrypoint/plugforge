const { execSync } = require('child_process');
const path = require('path');

try {
  const output = execSync('cargo check 2>&1', {
    cwd: 'C:\\dev\\rs-plugkit',
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 10 * 1024 * 1024
  });
  console.log(output.split('\n').slice(0, 100).join('\n'));
} catch (err) {
  console.log('STDOUT:', err.stdout);
  console.error('STDERR:', err.stderr);
  console.log('Exit code:', err.status);
}
