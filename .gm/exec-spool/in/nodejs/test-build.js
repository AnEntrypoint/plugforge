const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Testing build generation...\n');

try {
  // Clean build directory
  const buildDir = 'C:\\dev\\gm\\build';
  if (fs.existsSync(buildDir)) {
    console.log('Removing old build...');
    require('child_process').execSync(`rmdir /s /q "${buildDir}"`, { stdio: 'ignore' });
  }

  // Run build
  console.log('Generating build...');
  const result = execSync('node cli.js gm-starter ./build', {
    cwd: 'C:\\dev\\gm',
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  console.log('Build completed successfully\n');

  // Count platforms
  const platforms = fs.readdirSync(buildDir).filter(f => f.startsWith('gm-'));
  console.log(`Generated ${platforms.length} platforms:`);
  platforms.forEach(p => console.log(`  - ${p}`));

  // Verify all have lib files
  console.log('\nVerifying lib files in all platforms:');
  let allValid = true;
  for (const platform of platforms) {
    const libDir = path.join(buildDir, platform, 'lib');
    const bootstrap = path.join(libDir, 'daemon-bootstrap.js');
    const spool = path.join(libDir, 'spool-dispatch.js');

    const hasBootstrap = fs.existsSync(bootstrap);
    const hasSpool = fs.existsSync(spool);

    if (hasBootstrap && hasSpool) {
      console.log(`  ✓ ${platform}`);
    } else {
      console.log(`  ✗ ${platform} (missing: ${!hasBootstrap ? 'bootstrap' : ''} ${!hasSpool ? 'spool' : ''})`);
      allValid = false;
    }
  }

  if (allValid && platforms.length === 15) {
    console.log('\n✓ SUCCESS: All 15 platforms generated with spool-dispatch');
    process.exit(0);
  } else {
    console.log('\n✗ FAILURE: Some platforms missing required files');
    process.exit(1);
  }
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
