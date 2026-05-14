const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const projectRoot = 'C:\\dev\\gm';

console.log('=== GM-GC VALIDATION ===\n');

const mutsText = fs.readFileSync(path.join(projectRoot, '.gm', 'mutables.yml'), 'utf8');
const muts = yaml.parse(mutsText) || [];

const gmGcMuts = muts.filter(m => m.id.startsWith('gm-gc-'));

console.log(`CRITERION 1: Count gm-gc-* mutables`);
console.log(`Total gm-gc mutables: ${gmGcMuts.length}`);
console.log(`Witnessed: ${gmGcMuts.filter(m => m.status === 'witnessed').length}`);
console.log(`Unknown: ${gmGcMuts.filter(m => m.status === 'unknown').length}`);
console.log(`PASS: ${gmGcMuts.length === 9 ? 'YES (9 found)' : `NO (found ${gmGcMuts.length})`}\n`);

console.log('Gm-gc mutable IDs and witness_evidence:');
gmGcMuts.forEach((m, i) => {
  const evid = m.witness_evidence ? m.witness_evidence.substring(0, 50) : '[EMPTY]';
  console.log(`${i+1}. ${m.id}: ${m.status}`);
  console.log(`   Evidence: ${evid}...`);
});

console.log(`\nCRITERION 2: All have witness_evidence filled`);
const allFilled = gmGcMuts.every(m => m.witness_evidence && m.witness_evidence.trim().length > 0);
console.log(`PASS: ${allFilled ? 'YES' : 'NO'}\n`);

console.log(`CRITERION 3: gm-gc agents directory`);
const agentsDir = path.join(projectRoot, 'build', 'gm-gc', 'agents');
const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
console.log(`Found agents: ${agents.join(', ')}`);
const required = ['gm.md', 'planning.md', 'gm-execute.md', 'gm-emit.md', 'gm-complete.md'];
const hasAll = required.every(r => agents.includes(r));
console.log(`PASS: ${hasAll ? 'YES (5 core agents present)' : 'NO (missing some)'}\n`);

console.log(`CRITERION 4: hooks.json configured`);
const hooksPath = path.join(projectRoot, 'build', 'gm-gc', 'hooks', 'hooks.json');
const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
const hookNames = Object.keys(hooks || {});
console.log(`Hook types found: ${hookNames.join(', ')}`);
const requiredHooks = ['BeforeTool', 'SessionStart', 'BeforeAgent', 'SessionEnd'];
const hasHooks = requiredHooks.every(h => hookNames.includes(h));
console.log(`PASS: ${hasHooks ? 'YES (Gemini format correct)' : 'NO'}\n`);

console.log(`CRITERION 5: Spool helpers accessible`);
const spoolPath = path.join(projectRoot, 'gm-skill', 'index.js');
const spoolCode = fs.readFileSync(spoolPath, 'utf8');
const hasSpool = spoolCode.includes('writeSpool') && spoolCode.includes('readSpoolOutput');
console.log(`PASS: ${hasSpool ? 'YES (spool exports found)' : 'NO'}\n`);

console.log(`CRITERION 6: Daemon bootstrap integration`);
const daemonPath = path.join(projectRoot, 'gm-starter', 'lib', 'daemon-bootstrap.js');
const exists = fs.existsSync(daemonPath);
const daemonCode = exists ? fs.readFileSync(daemonPath, 'utf8') : '';
const hasExports = daemonCode.includes('checkState') && daemonCode.includes('spawn') && daemonCode.includes('shutdown');
console.log(`daemon-bootstrap.js exists: ${exists}`);
console.log(`Has required exports: ${hasExports}`);
console.log(`PASS: ${exists && hasExports ? 'YES' : 'NO'}\n`);

console.log('=== ACCEPTANCE SUMMARY ===');
const allPass = gmGcMuts.length === 9 &&
  gmGcMuts.every(m => m.status === 'witnessed') &&
  allFilled &&
  hasAll &&
  hasHooks &&
  hasSpool &&
  exists &&
  hasExports;

console.log(`All 6 criteria: ${allPass ? 'PASS ✓' : 'FAIL ✗'}`);
