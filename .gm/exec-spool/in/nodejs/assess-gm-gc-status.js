const fs = require('fs');
const path = require('path');

// Check if gm-gc was built and can be validated
const gcBuildPath = 'C:\\dev\\gm\\build\\gm-gc';
const gcPackagePath = path.join(gcBuildPath, 'package.json');

console.log('[assess-gm-gc-status] Assessing gm-gc build and validation status\n');

// Check build exists
if (!fs.existsSync(gcBuildPath)) {
  console.log('CRITICAL: gm-gc build not found at', gcBuildPath);
  process.exit(1);
}

console.log('✓ gm-gc build exists');

// Check package.json
if (fs.existsSync(gcPackagePath)) {
  const pkg = JSON.parse(fs.readFileSync(gcPackagePath, 'utf8'));
  console.log(`✓ Package: ${pkg.name}@${pkg.version}`);
  console.log(`  Bin: ${Object.keys(pkg.bin || {}).join(', ')}`);
  console.log(`  gm-skill in devDeps: ${pkg.devDependencies?.['@gm/gm-skill'] ? 'YES' : 'NO'}`);
}

// Check agent structure
const agentsPath = path.join(gcBuildPath, 'agents');
if (fs.existsSync(agentsPath)) {
  const agents = fs.readdirSync(agentsPath).filter(f =>
    fs.statSync(path.join(agentsPath, f)).isDirectory()
  );
  console.log(`\n✓ Core agents found (${agents.length}): ${agents.join(', ')}`);

  // Check for required agents
  const required = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete'];
  const missing = required.filter(r => !agents.includes(r));
  if (missing.length > 0) {
    console.log(`  ⚠ Missing required agents: ${missing.join(', ')}`);
  } else {
    console.log('  ✓ All 5 core agents present');
  }
}

// Check skills directory
const skillsPath = path.join(gcBuildPath, 'skills');
if (fs.existsSync(skillsPath)) {
  const skills = fs.readdirSync(skillsPath);
  console.log(`\n✓ Skills directory: ${skills.length} items`);
}

// Check hooks
const hooksPath = path.join(gcBuildPath, 'hooks', 'hooks.json');
if (fs.existsSync(hooksPath)) {
  const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
  console.log(`\n✓ Hooks configured: ${hooks.length || Object.keys(hooks).length} hooks`);
}

console.log('\n[assess-gm-gc-status] gm-gc build appears structurally complete');
console.log('Next: test gm-gc installation via bun x gm-gc@latest');
