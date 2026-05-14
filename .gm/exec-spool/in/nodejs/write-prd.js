const fs = require('fs');
const path = require('path');

const prd = `- id: commit-daemon-bootstrap
  subject: Stage modified files and commit daemon-bootstrap implementation
  status: pending
  description: Add gm-starter/lib/daemon-bootstrap.js and platform hook changes to git, commit with feat message, push to main. Clean exec-spool artifacts before staging.
  effort: small
  category: feature
  route_family: execution
  load: 0.3
  failure_modes: []
  route_fit: examined
  authorization: witnessed
  blocking: []
  blockedBy: []
  acceptance:
    - daemon-bootstrap.js committed with acptoapi auto-spawn capability
    - cli-config-shared.js hook integration committed
    - package-lock.json updated
    - commit pushed to origin/main
    - exec-spool cleaned (no artifacts left)
  edge_cases: []
`;

const prdPath = path.join('C:', 'dev', 'gm', '.gm', 'prd.yml');
fs.writeFileSync(prdPath, prd, 'utf8');
console.log(`PRD written to ${prdPath}`);
