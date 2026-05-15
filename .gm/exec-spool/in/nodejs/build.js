const { execSync } = require('child_process');
try {
  const result = execSync('node cli.js gm-starter ./build', {
    cwd: 'C:/dev/gm',
    encoding: 'utf8',
    timeout: 120000,
    stdio: ['inherit', 'pipe', 'pipe']
  });
  console.log(result);
} catch (e) {
  console.error('STDOUT:', e.stdout);
  console.error('STDERR:', e.stderr);
  process.exit(1);
}
