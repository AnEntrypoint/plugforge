const fs = require('fs');
const path = require('path');

console.log('[final-validation-check] End-to-end gm-gc validation status\n');

// 1. Check if PRD has the 3 required items
const prdPath = 'C:\\dev\\gm\\.gm\\prd.yml';
let prdValid = false;
if (fs.existsSync(prdPath)) {
  const prd = fs.readFileSync(prdPath, 'utf8');
  const hasAll = prd.includes('validate-gm-gc-installation') &&
                 prd.includes('feature-parity-validation') &&
                 prd.includes('e2e-gemini-test');
  prdValid = hasAll && prd.length > 500;
  console.log(`[${hasAll ? '✓' : '✗'}] PRD contains 3 gm-gc validation items`);
} else {
  console.log('[✗] PRD file missing');
}

// 2. Check if gm-gc exists and is installable via bun
console.log('\n[gm-gc installation checks]');
try {
  const gcPackageJson = 'C:\\dev\\gm\\build\\gm-gc\\package.json';
  if (fs.existsSync(gcPackageJson)) {
    const pkg = JSON.parse(fs.readFileSync(gcPackageJson, 'utf8'));
    console.log(`[✓] gm-gc package.json found`);
    console.log(`    name: ${pkg.name}, version: ${pkg.version}`);

    // Check for key dependencies
    if (pkg.devDependencies && pkg.devDependencies['@gm/gm-skill']) {
      console.log(`[✓] @gm/gm-skill is a devDependency`);
    } else {
      console.log(`[⚠] @gm/gm-skill not found in devDependencies`);
    }
  } else {
    console.log('[✗] gm-gc package.json not found at build/gm-gc/');
  }
} catch (e) {
  console.log(`[✗] Error reading gm-gc package.json: ${e.message}`);
}

// 3. Check if all 5 core agents exist
console.log('\n[gm-gc agent checks]');
const agentsDir = 'C:\\dev\\gm\\build\\gm-gc\\agents';
if (fs.existsSync(agentsDir)) {
  const agents = fs.readdirSync(agentsDir);
  const required = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete'];
  const present = required.filter(a => agents.includes(a));
  console.log(`[${present.length === 5 ? '✓' : '✗'}] Found ${present.length}/5 core agents`);
  required.forEach(a => {
    const exists = agents.includes(a);
    console.log(`    ${exists ? '✓' : '✗'} ${a}`);
  });
} else {
  console.log(`[✗] agents directory not found at ${agentsDir}`);
}

// 4. Check if hooks are configured for Gemini
console.log('\n[gm-gc hooks checks]');
const hooksFile = 'C:\\dev\\gm\\build\\gm-gc\\hooks\\hooks.json';
if (fs.existsSync(hooksFile)) {
  const hooks = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
  const hasRequiredHooks = hooks.some(h => h.event === 'BeforeTool') &&
                           hooks.some(h => h.event === 'SessionStart') &&
                           hooks.some(h => h.event === 'BeforeAgent') &&
                           hooks.some(h => h.event === 'SessionEnd');
  console.log(`[${hasRequiredHooks ? '✓' : '✗'}] Hooks configured for Gemini platform`);
  console.log(`    Total hooks: ${hooks.length}`);
} else {
  console.log(`[✗] hooks.json not found`);
}

// 5. Check if spool helpers are available
console.log('\n[gm-gc spool helper checks]');
try {
  // Try to require @gm/gm-skill
  try {
    const gmSkill = require('@gm/gm-skill');
    if (gmSkill.spool) {
      const expectedFns = ['writeSpool', 'readSpoolOutput', 'waitForCompletion', 'getAllOutputs'];
      const present = expectedFns.filter(fn => typeof gmSkill.spool[fn] === 'function');
      console.log(`[${present.length === 4 ? '✓' : '✗'}] @gm/gm-skill spool helpers: ${present.length}/4`);
    } else {
      throw new Error('spool namespace not found');
    }
  } catch (e) {
    console.log(`[ℹ] @gm/gm-skill not available as npm module: ${e.message}`);

    // Check fallback
    const fallback = 'C:\\dev\\gm\\gm-starter\\lib\\spool.js';
    if (fs.existsSync(fallback)) {
      console.log(`[✓] Fallback spool.js found at gm-starter/lib/`);
    } else {
      console.log(`[✗] No fallback spool.js available`);
    }
  }
} catch (e) {
  console.log(`[✗] Error checking spool: ${e.message}`);
}

// 6. Check mutables status
console.log('\n[gm-gc mutables status]');
const mutablesPath = 'C:\\dev\\gm\\.gm\\mutables.yml';
if (fs.existsSync(mutablesPath)) {
  const mutables = fs.readFileSync(mutablesPath, 'utf8');
  const gcMutables = [
    'gm-gc-bun-installation',
    'gm-gc-agents-complete',
    'gm-gc-hooks-configured',
    'gm-gc-spool-helpers',
    'gm-gc-feature-parity',
    'gm-gc-gemini-ready'
  ];

  const present = gcMutables.filter(m => mutables.includes(`id: ${m}`));
  console.log(`[${present.length > 0 ? '✓' : '✗'}] Found ${present.length}/6 gm-gc validation mutables`);

  // Check status of present mutables
  present.forEach(m => {
    const isWitnessed = mutables.includes(`id: ${m}`) &&
                       mutables.split(`id: ${m}`)[1].split('\n').slice(0, 10).join('\n').includes('witnessed');
    console.log(`    ${isWitnessed ? '✓' : '?'} ${m}`);
  });
} else {
  console.log('[⚠] mutables.yml not found');
}

// Final summary
console.log('\n=== VALIDATION SUMMARY ===');
if (prdValid) {
  console.log('[✓] PRD is properly configured for gm-gc validation');
  console.log('[→] Next: Run gm-skill and gm-execute to begin execution');
  console.log('[→] Then: Use gm-emit and gm-complete to finalize');
} else {
  console.log('[⚠] PRD needs setup or gm-gc validation tasks need to complete');
}
