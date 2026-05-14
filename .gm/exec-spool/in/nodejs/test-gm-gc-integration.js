const fs = require('fs');
const path = require('path');
const os = require('os');

try {
  console.log('[gm-gc-integration] Testing gm-gc integration features...');

  // Test 1: gm-skill availability
  console.log('\n[gm-gc-integration] Test 1: gm-skill module');
  try {
    const gmSkill = require('@gm/gm-skill');
    console.log('  ✓ @gm/gm-skill loaded');
    const exports = Object.keys(gmSkill || {});
    console.log(`  Exports: ${exports.slice(0, 10).join(', ')}`);

    // Check spool helpers
    if (gmSkill.spool) {
      console.log('  ✓ spool helpers exported');
      const spoolFuncs = Object.keys(gmSkill.spool);
      console.log(`  Spool functions: ${spoolFuncs.join(', ')}`);
    } else {
      console.log('  ✗ spool helpers NOT exported');
    }

    // Check daemon helpers
    if (gmSkill.checkPortReachable) {
      console.log('  ✓ checkPortReachable exported');
    }
    if (gmSkill.ensureAcptoapiRunning) {
      console.log('  ✓ ensureAcptoapiRunning exported');
    }
  } catch (e) {
    console.log(`  ✗ Failed to load: ${e.message.substring(0, 150)}`);
  }

  // Test 2: Spool helpers functionality
  console.log('\n[gm-gc-integration] Test 2: Spool helpers functionality');
  try {
    const { spool } = require('@gm/gm-skill');
    if (spool) {
      // Test writeSpool
      console.log('  Testing writeSpool...');
      const taskId = spool.writeSpool('console.log("test from spool")', 'nodejs');
      console.log(`  ✓ writeSpool returned task ID: ${taskId}`);

      // Test readSpoolOutput (should return null for non-existent)
      const output = spool.readSpoolOutput(99999);
      console.log(`  ✓ readSpoolOutput handles missing: ${output === null}`);

      // Test getAllOutputs
      const allOutputs = spool.getAllOutputs();
      console.log(`  ✓ getAllOutputs returns object: ${typeof allOutputs === 'object'}`);
      console.log(`  Completed tasks: ${Object.keys(allOutputs).length}`);

      // Test validateLang
      try {
        spool.validateLang('nodejs');
        console.log('  ✓ validateLang accepts nodejs');
      } catch (e) {
        console.log(`  ✗ validateLang failed: ${e.message}`);
      }
    } else {
      console.log('  ✗ spool helpers not available');
    }
  } catch (e) {
    console.log(`  ✗ Error: ${e.message.substring(0, 150)}`);
  }

  // Test 3: Daemon bootstrap availability
  console.log('\n[gm-gc-integration] Test 3: Daemon bootstrap');
  const daemonBootstrapPath = 'C:\\dev\\gm\\gm-starter\\lib\\daemon-bootstrap.js';
  if (fs.existsSync(daemonBootstrapPath)) {
    try {
      const daemonBootstrap = require(daemonBootstrapPath);
      const fns = Object.keys(daemonBootstrap);
      console.log(`  ✓ daemon-bootstrap.js loaded (${fns.length} functions)`);
      console.log(`  Functions: ${fns.join(', ')}`);

      const expectedFuncs = [
        'ensureAcptoapiRunning',
        'ensureRsCodeinsightDaemonRunning',
        'ensureRsLearningDaemonRunning',
        'ensureRsSearchDaemonRunning'
      ];
      expectedFuncs.forEach(fn => {
        const exists = fns.includes(fn);
        console.log(`  ${exists ? '✓' : '✗'} ${fn}`);
      });
    } catch (e) {
      console.log(`  ✗ Failed to load: ${e.message.substring(0, 150)}`);
    }
  } else {
    console.log('  ✗ daemon-bootstrap.js not found');
  }

  // Test 4: gm-gc specific integration points
  console.log('\n[gm-gc-integration] Test 4: gm-gc Gemini integration');
  const gcPath = 'C:\\dev\\gm\\build\\gm-gc';
  const geminiMd = path.join(gcPath, 'GEMINI.md');
  if (fs.existsSync(geminiMd)) {
    try {
      const content = fs.readFileSync(geminiMd, 'utf8');
      console.log(`  ✓ GEMINI.md found (${content.length} bytes)`);
      const sections = content.match(/^## /gm);
      console.log(`  Sections: ${sections ? sections.length : 0}`);
    } catch (e) {
      console.log(`  ✗ Error reading: ${e.message}`);
    }
  } else {
    console.log('  ℹ GEMINI.md not found');
  }

  const mcpJson = path.join(gcPath, '.mcp.json');
  if (fs.existsSync(mcpJson)) {
    try {
      const mcp = JSON.parse(fs.readFileSync(mcpJson, 'utf8'));
      console.log(`  ✓ .mcp.json found`);
      const keys = Object.keys(mcp);
      console.log(`  Config keys: ${keys.join(', ')}`);
    } catch (e) {
      console.log(`  ✗ .mcp.json parse error`);
    }
  }

  const geminiExt = path.join(gcPath, 'gemini-extension.json');
  if (fs.existsSync(geminiExt)) {
    try {
      const ext = JSON.parse(fs.readFileSync(geminiExt, 'utf8'));
      console.log(`  ✓ gemini-extension.json found`);
      const keys = Object.keys(ext);
      console.log(`  Extension keys: ${keys.join(', ')}`);
    } catch (e) {
      console.log(`  ✗ Parse error`);
    }
  }

  // Test 5: Environment and paths
  console.log('\n[gm-gc-integration] Test 5: Environment validation');
  const spoolDir = path.join(os.homedir(), '.claude', 'exec-spool');
  console.log(`  Spool dir exists: ${fs.existsSync(spoolDir)}`);
  const logDir = path.join(os.homedir(), '.claude', 'gm-log');
  console.log(`  Log dir exists: ${fs.existsSync(logDir)}`);

  const sessionId = process.env.CLAUDE_SESSION_ID;
  console.log(`  CLAUDE_SESSION_ID: ${sessionId ? sessionId.substring(0, 16) + '...' : 'not set'}`);

  console.log('\n[gm-gc-integration] Integration validation complete');
} catch (e) {
  console.error('[gm-gc-integration] Error:', e.message);
  process.exit(1);
}
