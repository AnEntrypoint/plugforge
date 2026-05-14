const fs = require('fs');
const path = require('path');

console.log('Checking AGENTS.md and SKILL.md files for acptoapi documentation...\n');

const agentsPath = '/c/dev/gm/AGENTS.md';
const skillPaths = {
  'gm': '/c/dev/gm/gm-starter/skills/gm/SKILL.md',
  'gm-execute': '/c/dev/gm/gm-starter/skills/gm-execute/SKILL.md',
  'gm-emit': '/c/dev/gm/gm-starter/skills/gm-emit/SKILL.md',
  'gm-complete': '/c/dev/gm/gm-starter/skills/gm-complete/SKILL.md'
};

const results = {};

if (fs.existsSync(agentsPath)) {
  const content = fs.readFileSync(agentsPath, 'utf-8');
  results.agents_md = {
    has_acptoapi: content.includes('acptoapi'),
    has_daemon_bootstrap: content.includes('daemon-bootstrap')
  };
}

for (const [skill, skillPath] of Object.entries(skillPaths)) {
  if (fs.existsSync(skillPath)) {
    const content = fs.readFileSync(skillPath, 'utf-8');
    results[skill] = {
      has_acptoapi: content.includes('acptoapi'),
      needs_update: !content.includes('acptoapi')
    };
  } else {
    results[skill] = { exists: false };
  }
}

console.log(JSON.stringify(results, null, 2));
console.log('\nDocumentation status: Ready for updates');
