const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const gmDir = 'C:/dev/gm';
const buildDir = path.join(gmDir, 'build');

// Delete build directory
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
  console.log('Deleted build directory');
}

// Run build
try {
  const result = execSync('node cli.js gm-starter ./build', {
    cwd: gmDir,
    encoding: 'utf8',
    timeout: 180000,
  });
  console.log('Build output:');
  console.log(result);
} catch (e) {
  console.error('Build failed');
  console.error('STDOUT:', e.stdout);
  console.error('STDERR:', e.stderr);
  process.exit(1);
}
