const fs = require('fs');
const path = require('path');

console.log('=== Stage 10: Infrastructure Validation ===\n');

const gmDir = 'C:\\dev\\gm';
const requiredFiles = [
  'lib/spool-dispatch.js',
  'lib/daemon-bootstrap.js',
  'lib/skill-bootstrap.js',
  'AGENTS.md'
];

console.log('--- Checking required files ---');
let allExist = true;
requiredFiles.forEach(file => {
  const fullPath = path.join(gmDir, file);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✓' : '✗';
  console.log(`${status} ${file}`);
  if (!exists) allExist = false;
});

if (!allExist) {
  console.log('\nERROR: Some required files are missing');
  process.exit(1);
}

// Check AGENTS.md for spool-dispatch references
console.log('\n--- Checking AGENTS.md documentation ---');
const agentsContent = fs.readFileSync(path.join(gmDir, 'AGENTS.md'), 'utf-8');

const requiredSections = [
  'Spool dispatch gates',
  'SpoolDispatcher',
  'DaemonBootstrap',
  'spool-dispatch.js',
  'daemon-bootstrap.js',
  'skill-bootstrap.js'
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

// Check platform count
console.log('\n--- Checking platform documentation ---');
const platformMatches = agentsContent.match(/gm-cc|gm-gc|gm-oc|gm-kilo|gm-codex/g) || [];
const uniquePlatforms = new Set(platformMatches);
console.log(`Platform references found: ${uniquePlatforms.size}`);
if (uniquePlatforms.size > 0) {
  console.log('✓ Multiple platform references documented');
}

// Verify no hook generation remains
console.log('\n--- Checking for hook artifacts ---');
const buildDir = path.join(gmDir, 'build');
let platformsHaveHooks = false;

if (fs.existsSync(buildDir)) {
  const platforms = fs.readdirSync(buildDir).filter(f => f.startsWith('gm-'));
  console.log(`Found ${platforms.length} generated platforms`);

  platforms.forEach(platform => {
    const hooksPath = path.join(buildDir, platform, 'hooks');
    if (fs.existsSync(hooksPath)) {
      console.log(`✗ ${platform}: hooks/ directory exists (should not)`);
      platformsHaveHooks = true;
    }
  });

  if (!platformsHaveHooks) {
    console.log(`✓ All ${platforms.length} platforms: no hooks/ directories`);
  }
} else {
  console.log('⚠ Build directory not yet generated (run: node cli.js gm-starter ./build)');
}

// Verify SpoolDispatcher class
console.log('\n--- Checking SpoolDispatcher implementation ---');
try {
  const SpoolDispatcher = require(path.join(gmDir, 'lib/spool-dispatch.js'));
  const requiredMethods = [
    'checkPrdExists',
    'checkUnresolvedMutables',
    'checkGmFired',
    'checkNeedsGm',
    'canDispatchToolUse',
    'canExecuteWrite',
    'canExecuteGit',
    'checkDispatchGates'
  ];

  const dispatcher = new SpoolDispatcher(path.join(gmDir, '.gm'));

  requiredMethods.forEach(method => {
    if (typeof dispatcher[method] === 'function') {
      console.log(`✓ ${method}()`);
    } else {
      console.log(`✗ ${method}() NOT FOUND`);
      docsValid = false;
    }
  });
} catch (e) {
  console.log(`✗ Error loading SpoolDispatcher: ${e.message}`);
  docsValid = false;
}

// Verify DaemonBootstrap class
console.log('\n--- Checking DaemonBootstrap implementation ---');
try {
  const DaemonBootstrap = require(path.join(gmDir, 'lib/daemon-bootstrap.js'));
  const requiredMethods = [
    'checkState',
    'spawn',
    'waitForReady',
    'getSocket',
    'shutdown',
    'shutdownAll'
  ];

  const bootstrap = new DaemonBootstrap();

  requiredMethods.forEach(method => {
    if (typeof bootstrap[method] === 'function') {
      console.log(`✓ ${method}()`);
    } else {
      console.log(`✗ ${method}() NOT FOUND`);
      docsValid = false;
    }
  });
} catch (e) {
  console.log(`✗ Error loading DaemonBootstrap: ${e.message}`);
  docsValid = false;
}

if (!docsValid) {
  console.log('\n✗ Validation failed');
  process.exit(1);
}

console.log('\n✓ Stage 10: All infrastructure validation passed');
process.exit(0);
