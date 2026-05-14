const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('[gm-gc-validate] Starting gm-gc validation...');

  // Test 1: Check if bun x gm-gc@latest is available
  console.log('[gm-gc-validate] Test 1: Checking bun x gm-gc@latest availability...');
  try {
    const helpOutput = execSync('bun x gm-gc@latest --help 2>&1', {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 15000,
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'
    });
    console.log('[gm-gc-validate] ✓ gm-gc help output received');
    console.log('[gm-gc-validate] Help output (first 500 chars):');
    console.log(helpOutput.substring(0, 500));
  } catch (e) {
    console.log('[gm-gc-validate] ✗ bun x gm-gc@latest failed:', e.message.substring(0, 200));
  }

  // Test 2: Check local build if it exists
  console.log('[gm-gc-validate] Test 2: Checking local gm-gc build...');
  const localGcPath = 'C:\\dev\\gm\\build\\gm-gc';
  const localGcBin = path.join(localGcPath, 'bin', 'gm-gc.js');
  if (fs.existsSync(localGcBin)) {
    console.log('[gm-gc-validate] ✓ Local gm-gc build found at:', localGcPath);
    try {
      const localHelp = execSync(`node "${localGcBin}" --help 2>&1`, {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 5000
      });
      console.log('[gm-gc-validate] ✓ Local gm-gc help works');
      console.log('[gm-gc-validate] Help output (first 500 chars):');
      console.log(localHelp.substring(0, 500));
    } catch (e) {
      console.log('[gm-gc-validate] ✗ Local gm-gc help failed:', e.message.substring(0, 100));
    }
  } else {
    console.log('[gm-gc-validate] ℹ Local gm-gc build not found at:', localGcPath);
  }

  // Test 3: Check gm-gc package.json
  console.log('[gm-gc-validate] Test 3: Checking gm-gc package.json...');
  const gcPkgPath = path.join(localGcPath, 'package.json');
  if (fs.existsSync(gcPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(gcPkgPath, 'utf8'));
    console.log('[gm-gc-validate] ✓ gm-gc package.json found');
    console.log('[gm-gc-validate] Name:', pkg.name);
    console.log('[gm-gc-validate] Version:', pkg.version);
    console.log('[gm-gc-validate] Main:', pkg.main);
    console.log('[gm-gc-validate] Scripts:', Object.keys(pkg.scripts || {}).join(', '));
  }

  // Test 4: Check skills directory
  console.log('[gm-gc-validate] Test 4: Checking skills directory...');
  const gcSkillsPath = path.join(localGcPath, 'skills');
  if (fs.existsSync(gcSkillsPath)) {
    const skills = fs.readdirSync(gcSkillsPath).filter(f => fs.statSync(path.join(gcSkillsPath, f)).isDirectory());
    console.log('[gm-gc-validate] ✓ Skills found:', skills.length);
    console.log('[gm-gc-validate] Core skills present:');
    const coreSkills = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete'];
    coreSkills.forEach(skill => {
      const exists = skills.includes(skill);
      console.log(`  ${exists ? '✓' : '✗'} ${skill}`);
    });
  } else {
    console.log('[gm-gc-validate] ℹ Skills directory not found');
  }

  // Test 5: Check hooks configuration
  console.log('[gm-gc-validate] Test 5: Checking hooks...');
  const hooksPath = path.join(localGcPath, 'hooks', 'hooks.json');
  if (fs.existsSync(hooksPath)) {
    try {
      const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
      console.log('[gm-gc-validate] ✓ hooks.json found with', Object.keys(hooks).length, 'hooks');
      console.log('[gm-gc-validate] Hook events:', Object.keys(hooks).join(', '));
    } catch (e) {
      console.log('[gm-gc-validate] ✗ hooks.json parse error:', e.message.substring(0, 100));
    }
  } else {
    console.log('[gm-gc-validate] ℹ hooks.json not found');
  }

  // Test 6: Check if gm-gc loads correctly
  console.log('[gm-gc-validate] Test 6: Attempting to load gm-gc module...');
  try {
    const indexPath = path.join(localGcPath, 'index.js');
    if (fs.existsSync(indexPath)) {
      const gmGc = require(indexPath);
      console.log('[gm-gc-validate] ✓ gm-gc module loaded');
      console.log('[gm-gc-validate] Exports:', Object.keys(gmGc).slice(0, 10).join(', '));
    } else {
      console.log('[gm-gc-validate] ℹ index.js not found for direct load test');
    }
  } catch (e) {
    console.log('[gm-gc-validate] ✗ Failed to load gm-gc module:', e.message.substring(0, 150));
  }

  console.log('[gm-gc-validate] Validation complete');
} catch (e) {
  console.error('[gm-gc-validate] Error:', e.message);
  process.exit(1);
}
