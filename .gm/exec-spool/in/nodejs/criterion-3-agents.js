const fs = require('fs');
const path = require('path');

const agentsDir = path.join(process.cwd(), 'build', 'gm-gc', 'agents');
const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));

console.log(`CRITERION 3: gm-gc agents directory`);
console.log(`Found agents in ${agentsDir}:`);
agents.forEach(a => console.log(`  - ${a}`));

const required = ['gm.md', 'planning.md', 'gm-execute.md', 'gm-emit.md', 'gm-complete.md'];
const hasAll = required.every(r => agents.includes(r));

console.log(`\nRequired agents:`);
required.forEach(r => {
  const present = agents.includes(r) ? 'PRESENT' : 'MISSING';
  console.log(`  ${r}: ${present}`);
});

console.log(`\nCRITERION 3 PASS: ${hasAll}`);
