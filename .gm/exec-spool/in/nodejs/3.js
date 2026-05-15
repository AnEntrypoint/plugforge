const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const gmDir = 'C:/dev/gm';
const buildDir = path.join(gmDir, 'build');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
try {
  execSync('node cli.js gm-starter ./build', { cwd: gmDir, stdio: 'inherit', timeout: 180000 });
  console.log('Build complete');
} catch (e) {
  console.error('Build failed:', e.message);
  process.exit(1);
}
