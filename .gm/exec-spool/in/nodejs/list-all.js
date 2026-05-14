const fs = require('fs');
const path = require('path');

const skillsDir = path.join(process.cwd(), 'gm-starter', 'skills');
console.log('Skills:');
if (fs.existsSync(skillsDir)) {
  fs.readdirSync(skillsDir).forEach(name => console.log(`  ${name}`));
}

const agentsDir = path.join(process.cwd(), 'gm-starter', 'agents');
console.log('\nAgents:');
if (fs.existsSync(agentsDir)) {
  fs.readdirSync(agentsDir).forEach(name => console.log(`  ${name}`));
}
