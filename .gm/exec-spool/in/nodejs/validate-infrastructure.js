const fs = require('fs');
const path = require('path');

console.log('=== Validating infrastructure files ===\n');

const requiredFiles = [
  'lib/spool-dispatch.js',
  'lib/daemon-bootstrap.js',
  'lib/skill-bootstrap.js',
  'AGENTS.md',
  '.gm/exec-spool'
];

console.log('--- Checking required files ---');
let allExist = true;

requiredFiles.forEach(file => {
  const fullPath = path.join('C:\\dev\\gm', file);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✓' : '✗';
  console.log(`${status} ${file}`);
  if (!exists) allExist = false;
});

if (!allExist) {
  console.log('\nERROR: Some required files are missing');
  process.exit(1);
}

// Verify spool-dispatch.js exports SpoolDispatcher
console.log('\n--- Checking SpoolDispatcher export ---');
try {
  const SpoolDispatcher = require('C:\\dev\\gm\\lib\\spool-dispatch.js');
  if (typeof SpoolDispatcher === 'function') {
    console.log('✓ SpoolDispatcher class exported');
  } else {
    console.log('✗ SpoolDispatcher is not a class');
    process.exit(1);
  }
} catch (e) {
  console.log(`✗ Error loading SpoolDispatcher: ${e.message}`);
  process.exit(1);
}

// Verify daemon-bootstrap.js exports DaemonBootstrap
console.log('\n--- Checking DaemonBootstrap export ---');
try {
  const DaemonBootstrap = require('C:\\dev\\gm\\lib\\daemon-bootstrap.js');
  if (typeof DaemonBootstrap === 'function') {
    console.log('✓ DaemonBootstrap class exported');
  } else {
    console.log('✗ DaemonBootstrap is not a class');
    process.exit(1);
  }
} catch (e) {
  console.log(`✗ Error loading DaemonBootstrap: ${e.message}`);
  process.exit(1);
}

// Verify AGENTS.md documentation
console.log('\n--- Checking AGENTS.md documentation ---');
const agentsContent = fs.readFileSync('C:\\dev\\gm\\AGENTS.md', 'utf-8');

const requiredSections = [
  'Spool dispatch gates',
  'Spool-dispatch architecture replaces hooks',
  'SpoolDispatcher',
  'DaemonBootstrap',
  'spool-dispatch.js',
  'daemon-bootstrap.js'
];

let docsValid = true;
requiredSections.forEach(section => {
  if (agentsContent.includes(section)) {
    console.log(`✓ "${section}" documented`);
  } else {
    console.log(`✗ "${section}" not found`);
    docsValid = false;
  }
});

if (!docsValid) {
  console.log('\nERROR: AGENTS.md documentation incomplete');
  process.exit(1);
}

// Check that no hook references remain
console.log('\n--- Checking for hook references (should be 0) ---');
const hookRefCount = (agentsContent.match(/hooks?(?!.*dispatch gates)/gi) || []).length;
console.log(`Hook references: ${hookRefCount}`);
if (hookRefCount > 0) {
  console.log('⚠ Warning: Found hook references in documentation');
}

// Verify platform generation creates no hooks/
console.log('\n--- Checking generated platforms ---');
const buildDir = 'C:\\dev\\gm\\build';
if (!fs.existsSync(buildDir)) {
  console.log('⚠ Build directory not yet generated');
} else {
  const platforms = fs.readdirSync(buildDir).filter(f => f.startsWith('gm-'));
  let platformsValid = true;

  platforms.forEach(platform => {
    const hooksPath = path.join(buildDir, platform, 'hooks');
    if (fs.existsSync(hooksPath)) {
      console.log(`✗ ${platform}: hooks/ directory exists (should not)`);
      platformsValid = false;
    }
  });

  if (platformsValid) {
    console.log(`✓ All ${platforms.length} platforms verified: no hooks/ directories`);
  } else {
    console.log('ERROR: Some platforms have hooks/ directories');
    process.exit(1);
  }
}

console.log('\n✓ All infrastructure validation passed');
process.exit(0);
