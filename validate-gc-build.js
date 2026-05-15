#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CHECKS = [
  // Core directories
  ['skills directory', 'build/gm-gc/skills'],
  ['agents directory', 'build/gm-gc/agents'],
  ['hooks directory', 'build/gm-gc/hooks'],
  ['scripts directory', 'build/gm-gc/scripts'],
  ['bin directory', 'build/gm-gc/bin'],
  ['prompts directory', 'build/gm-gc/prompts'],
  
  // Config files
  ['package.json', 'build/gm-gc/package.json'],
  ['hooks.json', 'build/gm-gc/hooks/hooks.json'],
  ['gemini-extension.json', 'build/gm-gc/gemini-extension.json'],
  ['GEMINI.md', 'build/gm-gc/GEMINI.md'],
  ['AGENTS.md', 'build/gm-gc/AGENTS.md'],
  
  // Installation scripts
  ['cli.js installer', 'build/gm-gc/cli.js'],
  ['install.js postinstall', 'build/gm-gc/install.js'],
  
  // Binary files
  ['plugkit.js wrapper', 'build/gm-gc/bin/plugkit.js'],
  ['plugkit.sha256 manifest', 'build/gm-gc/bin/plugkit.sha256'],
  ['bootstrap.js', 'build/gm-gc/bin/bootstrap.js'],
  
  // Prompts
  ['bash-deny.txt prompt', 'build/gm-gc/prompts/bash-deny.txt'],
  ['session-start.txt prompt', 'build/gm-gc/prompts/session-start.txt'],
  ['prompt-submit.txt prompt', 'build/gm-gc/prompts/prompt-submit.txt'],
  ['pre-compact.txt prompt', 'build/gm-gc/prompts/pre-compact.txt'],
  
  // Key skills (sample)
  ['gm skill', 'build/gm-gc/skills/gm/SKILL.md'],
  ['planning skill', 'build/gm-gc/skills/planning/SKILL.md'],
  ['gm-execute skill', 'build/gm-gc/skills/gm-execute/SKILL.md'],
  ['gm-emit skill', 'build/gm-gc/skills/gm-emit/SKILL.md'],
  ['gm-complete skill', 'build/gm-gc/skills/gm-complete/SKILL.md'],
];

console.log('='.repeat(70));
console.log('gm-gc Build Validation Report');
console.log('='.repeat(70));
console.log();

let passed = 0;
let failed = 0;
const failedChecks = [];

CHECKS.forEach(([name, location]) => {
  const fullPath = path.resolve(location);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name} (${location})`);
    failed++;
    failedChecks.push(name);
  }
});

console.log();
console.log('-'.repeat(70));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('-'.repeat(70));
console.log();

// Validate config files
console.log('Configuration Validation:');
console.log();

try {
  const pkgJson = JSON.parse(fs.readFileSync('build/gm-gc/package.json', 'utf-8'));
  console.log(`  ✓ package.json valid (name: ${pkgJson.name}, version: ${pkgJson.version})`);
  console.log(`    - files array includes: ${pkgJson.files.join(', ')}`);
  console.log(`    - bin commands: ${Object.keys(pkgJson.bin).join(', ')}`);
} catch (e) {
  console.log(`  ✗ package.json parsing failed: ${e.message}`);
  failed++;
}

try {
  const hooksJson = JSON.parse(fs.readFileSync('build/gm-gc/hooks/hooks.json', 'utf-8'));
  const eventKeys = Object.keys(hooksJson.hooks);
  console.log(`  ✓ hooks.json valid (events: ${eventKeys.join(', ')})`);
} catch (e) {
  console.log(`  ✗ hooks.json parsing failed: ${e.message}`);
  failed++;
}

try {
  const geminiJson = JSON.parse(fs.readFileSync('build/gm-gc/gemini-extension.json', 'utf-8'));
  console.log(`  ✓ gemini-extension.json valid (name: ${geminiJson.name}, version: ${geminiJson.version})`);
} catch (e) {
  console.log(`  ✗ gemini-extension.json parsing failed: ${e.message}`);
  failed++;
}

// Count skills
try {
  const skillsDir = 'build/gm-gc/skills';
  const skills = fs.readdirSync(skillsDir)
    .filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());
  console.log(`  ✓ Skills found: ${skills.length} (${skills.join(', ')})`);
} catch (e) {
  console.log(`  ✗ Skills count failed: ${e.message}`);
  failed++;
}

// Count agents
try {
  const agentsDir = 'build/gm-gc/agents';
  const agents = fs.readdirSync(agentsDir)
    .filter(f => f.endsWith('.md'));
  console.log(`  ✓ Agents found: ${agents.length} (${agents.join(', ')})`);
} catch (e) {
  console.log(`  ✗ Agents count failed: ${e.message}`);
  failed++;
}

console.log();
console.log('-'.repeat(70));
console.log();

// Installation script validation
console.log('Installation Scripts Validation:');
console.log();

try {
  const cliJs = fs.readFileSync('build/gm-gc/cli.js', 'utf-8');
  const hasFilesToCopy = cliJs.includes('filesToCopy');
  const hasCopyRecursive = cliJs.includes('copyRecursive');
  const hasGeminiPath = cliJs.includes('.gemini');
  
  console.log(`  ✓ cli.js structure:`);
  console.log(`    - filesToCopy array: ${hasFilesToCopy ? '✓' : '✗'}`);
  console.log(`    - copyRecursive function: ${hasCopyRecursive ? '✓' : '✗'}`);
  console.log(`    - .gemini path handling: ${hasGeminiPath ? '✓' : '✗'}`);
} catch (e) {
  console.log(`  ✗ cli.js validation failed: ${e.message}`);
  failed++;
}

try {
  const installJs = fs.readFileSync('build/gm-gc/install.js', 'utf-8');
  const hasNodeModulesCheck = installJs.includes('isInsideNodeModules');
  const hasSafeCopy = installJs.includes('safeCopyDirectory');
  const copiesDirs = installJs.match(/safeCopyDirectory.*?\n/g) || [];
  
  console.log(`  ✓ install.js structure:`);
  console.log(`    - node_modules detection: ${hasNodeModulesCheck ? '✓' : '✗'}`);
  console.log(`    - safeCopyDirectory function: ${hasSafeCopy ? '✓' : '✗'}`);
  console.log(`    - directories copied: ${copiesDirs.length}`);
} catch (e) {
  console.log(`  ✗ install.js validation failed: ${e.message}`);
  failed++;
}

console.log();
console.log('='.repeat(70));

if (failed === 0) {
  console.log('✅ All checks passed! gm-gc is ready for use.');
  console.log();
  console.log('Installation options:');
  console.log('  1. Direct: node build/gm-gc/cli.js');
  console.log('  2. npm: npm install gm-gc && npm run gm-gc-install');
  console.log('  3. git: git clone https://github.com/AnEntrypoint/gm-gc ~/.gemini/extensions/gm');
  console.log();
} else {
  console.log(`❌ ${failed} checks failed:`);
  failedChecks.forEach(check => console.log(`   - ${check}`));
  console.log();
  process.exit(1);
}
