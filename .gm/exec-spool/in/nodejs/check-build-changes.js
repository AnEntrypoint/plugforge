const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Checking build directory changes ===\n');

// Check if build directory exists
const buildDir = 'C:\\dev\\gm\\build';
if (!fs.existsSync(buildDir)) {
  console.log('Build directory does not exist');
  process.exit(0);
}

// Count files in each platform
const platforms = fs.readdirSync(buildDir).filter(f => f.startsWith('gm-'));
console.log(`Found ${platforms.length} platforms\n`);

platforms.forEach(platform => {
  const platformDir = path.join(buildDir, platform);
  const files = countFilesRecursive(platformDir);
  console.log(`${platform}: ${files} files`);
});

// Check if there are any hooks directories
console.log('\n=== Checking for hooks/ directories ===');
const hasHooks = platforms.some(p => {
  const hooksPath = path.join(buildDir, p, 'hooks');
  return fs.existsSync(hooksPath);
});

if (hasHooks) {
  console.log('ERROR: hooks/ directories found!');
  process.exit(1);
} else {
  console.log('✓ No hooks/ directories found');
}

// Check if gm.json exists in each platform
console.log('\n=== Checking for gm.json ===');
let gmJsonCount = 0;
platforms.forEach(p => {
  const gmJsonPath = path.join(buildDir, p, 'gm.json');
  if (fs.existsSync(gmJsonPath)) {
    gmJsonCount++;
  }
});
console.log(`gm.json present in ${gmJsonCount}/${platforms.length} platforms`);

function countFilesRecursive(dir) {
  let count = 0;
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) count++;
    else if (stat.isDirectory()) count += countFilesRecursive(fullPath);
  });
  return count;
}
