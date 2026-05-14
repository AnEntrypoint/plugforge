const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('[rebuild] starting gm-starter build...');
  const result = execSync('node cli.js gm-starter ./build', {
    cwd: path.resolve(__dirname, '../../..'),
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  console.log(result);
  console.log('[rebuild] gm-starter build completed successfully');
  process.exit(0);
} catch (e) {
  console.error('[rebuild] FAILED:', e.message);
  if (e.stdout) console.error(e.stdout);
  if (e.stderr) console.error(e.stderr);
  process.exit(1);
}
