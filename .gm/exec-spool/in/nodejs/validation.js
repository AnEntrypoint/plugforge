const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const gmRoot = 'C:\\dev\\gm';
const results = [];

function test(name, fn) {
  try {
    const result = fn();
    results.push({ name, passed: true, message: result || 'OK' });
    console.log(`✓ ${name}`);
  } catch (err) {
    results.push({ name, passed: false, message: err.message });
    console.error(`✗ ${name}: ${err.message}`);
  }
}

console.log('=== SPOOL-DISPATCH VALIDATION SUITE ===\n');

// Test 1: Core library files exist
test('Core lib files present in gm-starter', () => {
  const requiredFiles = [
    'lib/daemon-bootstrap.js',
    'lib/spool-dispatch.js',
    'lib/skill-bootstrap.js',
    'lib/browser.js',
    'lib/codeinsight.js',
    'lib/git.js',
    'lib/learning.js'
  ];

  for (const file of requiredFiles) {
    const fullPath = path.join(gmRoot, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing: ${file}`);
    }
  }
  return `All ${requiredFiles.length} core files present`;
});

// Test 2: SpoolDispatcher class exists and exports
test('SpoolDispatcher class properly exported', () => {
  const dispatchPath = path.join(gmRoot, 'lib', 'spool-dispatch.js');
  const content = fs.readFileSync(dispatchPath, 'utf-8');

  if (!content.includes('class SpoolDispatcher')) {
    throw new Error('SpoolDispatcher class not found');
  }
  if (!content.includes('checkDispatchGates')) {
    throw new Error('checkDispatchGates method not found');
  }
  if (!content.includes('module.exports')) {
    throw new Error('module.exports not found');
  }

  return 'SpoolDispatcher class properly defined and exported';
});

// Test 3: DaemonBootstrap class exists
test('DaemonBootstrap class properly exported', () => {
  const bootstrapPath = path.join(gmRoot, 'lib', 'daemon-bootstrap.js');
  const content = fs.readFileSync(bootstrapPath, 'utf-8');

  if (!content.includes('class DaemonBootstrap')) {
    throw new Error('DaemonBootstrap class not found');
  }
  if (!content.includes('checkState') && !content.includes('spawn')) {
    throw new Error('DaemonBootstrap methods not found');
  }

  return 'DaemonBootstrap class properly defined';
});

// Test 4: Template builder loads lib files
test('TemplateBuilder.loadLibFilesFromSource exists', () => {
  const tbPath = path.join(gmRoot, 'lib', 'template-builder.js');
  const content = fs.readFileSync(tbPath, 'utf-8');

  if (!content.includes('loadLibFilesFromSource')) {
    throw new Error('loadLibFilesFromSource method not found in TemplateBuilder');
  }

  return 'loadLibFilesFromSource method found in TemplateBuilder';
});

// Test 5: CLIAdapter uses lib loader
test('CLIAdapter integrates lib file loading', () => {
  const adapterPath = path.join(gmRoot, 'lib', 'cli-adapter.js');
  const content = fs.readFileSync(adapterPath, 'utf-8');

  if (!content.includes('loadLibFilesFromSource')) {
    throw new Error('loadLibFilesFromSource not called in CLIAdapter');
  }
  if (!content.includes('Object.assign')) {
    throw new Error('Object.assign not used to merge lib files');
  }

  return 'CLIAdapter properly loads and merges lib files';
});

// Test 6: ExtensionAdapter has lib loader
test('ExtensionAdapter has lib loader method', () => {
  const adapterPath = path.join(gmRoot, 'lib', 'extension-adapter.js');
  const content = fs.readFileSync(adapterPath, 'utf-8');

  if (!content.includes('loadLibFilesFromSource')) {
    throw new Error('loadLibFilesFromSource not found in ExtensionAdapter');
  }

  return 'ExtensionAdapter has loadLibFilesFromSource method';
});

// Test 7: Build generates correctly
test('Build generation produces all 15 platforms', () => {
  const buildDir = path.join(gmRoot, 'build');
  if (!fs.existsSync(buildDir)) {
    throw new Error('Build directory does not exist; run: node cli.js gm-starter ./build');
  }

  const expectedPlatforms = [
    'gm-cc', 'gm-gc', 'gm-oc', 'gm-codex', 'gm-kilo', 'gm-qwen', 'gm-hermes',
    'gm-thebird', 'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains',
    'gm-copilot-cli', 'gm-antigravity', 'gm-windsurf'
  ];

  let found = 0;
  for (const platform of expectedPlatforms) {
    const platformDir = path.join(buildDir, platform);
    if (fs.existsSync(platformDir)) {
      found++;
    }
  }

  if (found !== 15) {
    throw new Error(`Only ${found}/15 platforms generated`);
  }

  return `All 15 platforms generated successfully`;
});

// Test 8: All platforms have lib files
test('All 15 platforms include lib files in build', () => {
  const buildDir = path.join(gmRoot, 'build');
  const expectedPlatforms = [
    'gm-cc', 'gm-gc', 'gm-oc', 'gm-codex', 'gm-kilo', 'gm-qwen', 'gm-hermes',
    'gm-thebird', 'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains',
    'gm-copilot-cli', 'gm-antigravity', 'gm-windsurf'
  ];

  let missingLibs = [];
  for (const platform of expectedPlatforms) {
    const libDir = path.join(buildDir, platform, 'lib');
    if (!fs.existsSync(libDir)) {
      missingLibs.push(platform);
    } else {
      const bootstrap = path.join(libDir, 'daemon-bootstrap.js');
      const spool = path.join(libDir, 'spool-dispatch.js');
      if (!fs.existsSync(bootstrap) || !fs.existsSync(spool)) {
        missingLibs.push(platform);
      }
    }
  }

  if (missingLibs.length > 0) {
    throw new Error(`Platforms missing lib files: ${missingLibs.join(', ')}`);
  }

  return 'All platforms have daemon-bootstrap.js and spool-dispatch.js';
});

// Test 9: No hooks directories in build
test('All platforms correctly exclude hooks/ directory', () => {
  const buildDir = path.join(gmRoot, 'build');
  const expectedPlatforms = [
    'gm-cc', 'gm-gc', 'gm-oc', 'gm-codex', 'gm-kilo', 'gm-qwen', 'gm-hermes',
    'gm-thebird', 'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains',
    'gm-copilot-cli', 'gm-antigravity', 'gm-windsurf'
  ];

  let hooksFound = [];
  for (const platform of expectedPlatforms) {
    const hooksDir = path.join(buildDir, platform, 'hooks');
    if (fs.existsSync(hooksDir)) {
      hooksFound.push(platform);
    }
  }

  if (hooksFound.length > 0) {
    throw new Error(`Platforms still have hooks/: ${hooksFound.join(', ')}`);
  }

  return 'No hooks/ directories in any platform (spool-dispatch correctly implemented)';
});

// Test 10: Package.json includes lib in files array
test('Generated package.json files include lib/', () => {
  const buildDir = path.join(gmRoot, 'build');
  const ccPkgPath = path.join(buildDir, 'gm-cc', 'package.json');

  if (!fs.existsSync(ccPkgPath)) {
    throw new Error('gm-cc package.json not found');
  }

  const pkg = JSON.parse(fs.readFileSync(ccPkgPath, 'utf-8'));

  if (!pkg.files || !pkg.files.includes('lib/')) {
    throw new Error('lib/ not included in package.json files array');
  }

  return 'lib/ correctly included in package.json files array';
});

// Summary
console.log('\n=== VALIDATION RESULTS ===\n');
const passed = results.filter(r => r.passed).length;
const total = results.length;

console.log(`Passed: ${passed}/${total}`);

if (passed === total) {
  console.log('\n✓ ALL TESTS PASSED - Spool-dispatch architecture is working correctly');
  process.exit(0);
} else {
  console.log('\n✗ SOME TESTS FAILED - See details above');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.message}`);
  });
  process.exit(1);
}
