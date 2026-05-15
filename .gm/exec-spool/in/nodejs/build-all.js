const { execSync } = require('child_process');
try {
  const result = execSync('node cli.js gm-starter ./build', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
  console.log(result);
} catch (e) {
  console.error('STDOUT:', e.stdout);
  console.error('STDERR:', e.stderr);
  process.exit(1);
}
