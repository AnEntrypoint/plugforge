const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  console.log('[gm-gc-structure] Testing gm-gc build structure and availability...');

  // Test 1: Check gm-gc build exists
  console.log('\n[gm-gc-structure] Test 1: Build structure');
  const gcPath = 'C:\\dev\\gm\\build\\gm-gc';
  const gcExists = fs.existsSync(gcPath);
  console.log(`  ✓ gm-gc build exists: ${gcExists}`);

  if (gcExists) {
    // Check critical files
    const files = {
      'package.json': path.join(gcPath, 'package.json'),
      'cli.js': path.join(gcPath, 'cli.js'),
      'agents/': path.join(gcPath, 'agents'),
      'hooks/hooks.json': path.join(gcPath, 'hooks', 'hooks.json'),
      '.mcp.json': path.join(gcPath, '.mcp.json'),
      'GEMINI.md': path.join(gcPath, 'GEMINI.md')
    };

    Object.entries(files).forEach(([name, fpath]) => {
      const exists = fs.existsSync(fpath);
      console.log(`  ${exists ? '✓' : '✗'} ${name}: ${exists}`);
    });
  }

  // Test 2: Check agents (skills) directory
  console.log('\n[gm-gc-structure] Test 2: Agents (skills) directory');
  const agentsPath = path.join(gcPath, 'agents');
  if (fs.existsSync(agentsPath)) {
    const agents = fs.readdirSync(agentsPath).filter(f => {
      const fpath = path.join(agentsPath, f);
      return fs.statSync(fpath).isDirectory();
    });
    console.log(`  Found ${agents.length} agent directories`);
    const coreAgents = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete'];
    coreAgents.forEach(agent => {
      const exists = agents.includes(agent);
      console.log(`  ${exists ? '✓' : '✗'} ${agent}`);
    });
  }

  // Test 3: Compare with gm-cc
  console.log('\n[gm-gc-structure] Test 3: Compare with gm-cc');
  const ccPath = 'C:\\dev\\gm\\build\\gm-cc';
  const ccExists = fs.existsSync(ccPath);
  console.log(`  ✓ gm-cc build exists: ${ccExists}`);

  if (ccExists) {
    const ccAgentsPath = path.join(ccPath, 'agents');
    if (fs.existsSync(ccAgentsPath)) {
      const ccAgents = fs.readdirSync(ccAgentsPath).filter(f => {
        const fpath = path.join(ccAgentsPath, f);
        return fs.statSync(fpath).isDirectory();
      });
      console.log(`  gm-cc agents count: ${ccAgents.length}`);
      const gcAgentsPath = path.join(gcPath, 'agents');
      if (fs.existsSync(gcAgentsPath)) {
        const gcAgents = fs.readdirSync(gcAgentsPath).filter(f => {
          const fpath = path.join(gcAgentsPath, f);
          return fs.statSync(fpath).isDirectory();
        });
        console.log(`  gm-gc agents count: ${gcAgents.length}`);
        console.log(`  ✓ Agents match: ${ccAgents.length === gcAgents.length}`);
      }
    }
  }

  // Test 4: Test help output
  console.log('\n[gm-gc-structure] Test 4: Help output');
  try {
    const helpOutput = execSync(`node "${path.join(gcPath, 'cli.js')}" --help 2>&1`, {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 5000
    });
    console.log(`  ✓ Help command succeeded (${helpOutput.length} bytes)`);
    const lines = helpOutput.split('\n').slice(0, 5);
    lines.forEach(line => console.log(`    ${line}`));
  } catch (e) {
    console.log(`  ✗ Help command failed: ${e.message.substring(0, 100)}`);
  }

  // Test 5: Test skill availability
  console.log('\n[gm-gc-structure] Test 5: Skill loading via require');
  try {
    const gcIndex = require(path.join(gcPath, 'index.js'));
    console.log(`  ✓ gm-gc index.js loaded`);
    const exports = Object.keys(gcIndex || {});
    console.log(`  Exports (${exports.length}): ${exports.slice(0, 5).join(', ')}`);
  } catch (e) {
    console.log(`  ✗ Failed to load: ${e.message.substring(0, 100)}`);
  }

  // Test 6: Hooks configuration
  console.log('\n[gm-gc-structure] Test 6: Hooks configuration');
  const hooksPath = path.join(gcPath, 'hooks', 'hooks.json');
  if (fs.existsSync(hooksPath)) {
    try {
      const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
      const hookEvents = Object.keys(hooks);
      console.log(`  ✓ hooks.json valid (${hookEvents.length} events)`);
      console.log(`  Events: ${hookEvents.join(', ')}`);
    } catch (e) {
      console.log(`  ✗ Hooks parse error: ${e.message}`);
    }
  } else {
    console.log(`  ✗ hooks.json not found`);
  }

  // Test 7: Feature comparison with gm-cc
  console.log('\n[gm-gc-structure] Test 7: Feature parity assessment');
  const gcPkg = JSON.parse(fs.readFileSync(path.join(gcPath, 'package.json'), 'utf8'));
  const ccPkg = ccExists ? JSON.parse(fs.readFileSync(path.join(ccPath, 'package.json'), 'utf8')) : null;

  console.log(`  gm-gc version: ${gcPkg.version}`);
  if (ccPkg) {
    console.log(`  gm-cc version: ${ccPkg.version}`);
    console.log(`  ✓ Versions match: ${gcPkg.version === ccPkg.version}`);
  }

  console.log(`  gm-gc main: ${gcPkg.main}`);
  if (ccPkg) {
    console.log(`  gm-cc main: ${ccPkg.main}`);
  }

  console.log('\n[gm-gc-structure] Validation complete');
} catch (e) {
  console.error('[gm-gc-structure] Error:', e.message);
  process.exit(1);
}
