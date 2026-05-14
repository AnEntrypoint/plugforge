const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('[gm-gc-validation] Starting comprehensive gm-gc validation...');

  const buildDir = 'C:\\dev\\gm\\build';
  const gmCcPath = path.join(buildDir, 'gm-cc');
  const gmGcPath = path.join(buildDir, 'gm-gc');

  // Helper to get bin path
  function getBinPath(platform) {
    return path.join(buildDir, \`gm-\${platform}\`, 'bin', \`gm-\${platform}.js\`);
  }

  // Helper to test skill
  function testSkill(platform, skill) {
    const binPath = getBinPath(platform);
    if (!fs.existsSync(binPath)) {
      return null;
    }
    try {
      const output = execSync(\`node "\${binPath}" skill \${skill} --help 2>&1\`, {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 5000
      });
      return output.length > 0;
    } catch (e) {
      return false;
    }
  }

  // Test gm-cc baseline
  console.log('[gm-gc-validation] Testing gm-cc baseline...');
  const ccBinPath = getBinPath('cc');
  const ccExists = fs.existsSync(ccBinPath);
  console.log('  gm-cc binary exists:', ccExists);

  if (ccExists) {
    try {
      const help = execSync(\`node "\${ccBinPath}" --help 2>&1 | head -20\`, {
        shell: true,
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 5000
      });
      console.log('  gm-cc help works: yes');
    } catch (e) {
      console.log('  gm-cc help works: error');
    }
  }

  // Test gm-gc
  console.log('[gm-gc-validation] Testing gm-gc...');
  const gcBinPath = getBinPath('gc');
  const gcExists = fs.existsSync(gcBinPath);
  console.log('  gm-gc binary exists:', gcExists);

  if (gcExists) {
    try {
      const help = execSync(\`node "\${gcBinPath}" --help 2>&1 | head -20\`, {
        shell: true,
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 5000
      });
      console.log('  gm-gc help works: yes');
      console.log('  Help output (first 100 chars):');
      console.log('  ' + help.substring(0, 100).replace(/\\n/g, '\\n  '));
    } catch (e) {
      console.log('  gm-gc help works: error -', e.message.substring(0, 100));
    }
  } else {
    console.log('  gm-gc not found - will need build step');
  }

  // Check package.json for feature parity
  if (gcExists) {
    const pkgPath = path.join(gmGcPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      console.log('[gm-gc-validation] gm-gc package info:');
      console.log('  Name:', pkg.name);
      console.log('  Version:', pkg.version);
      console.log('  Main:', pkg.main);
      console.log('  Scripts:', Object.keys(pkg.scripts || {}).join(', '));
    }
  }

  // Check skills directory
  console.log('[gm-gc-validation] Checking skills...');
  const gcSkillsDir = path.join(gmGcPath, 'skills');
  if (fs.existsSync(gcSkillsDir)) {
    const skills = fs.readdirSync(gcSkillsDir);
    console.log('  gm-gc has', skills.length, 'skills');
    const hasCoreSrills = {
      'gm': skills.includes('gm'),
      'planning': skills.includes('planning'),
      'gm-execute': skills.includes('gm-execute'),
      'gm-emit': skills.includes('gm-emit'),
      'gm-complete': skills.includes('gm-complete')
    };
    console.log('  Core skills present:', JSON.stringify(hasCoreSrills));
  }

  // Check hooks
  console.log('[gm-gc-validation] Checking hooks...');
  const gcHooksPath = path.join(gmGcPath, 'hooks', 'hooks.json');
  if (fs.existsSync(gcHooksPath)) {
    const hooksConfig = JSON.parse(fs.readFileSync(gcHooksPath, 'utf8'));
    console.log('  Hooks configured:', Object.keys(hooksConfig).length);
  }

  console.log('[gm-gc-validation] Comprehensive validation complete');
} catch (e) {
  console.error('[gm-gc-validation] Error:', e.message);
  process.exit(1);
}
