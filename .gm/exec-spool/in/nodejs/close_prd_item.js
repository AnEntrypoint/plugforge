const fs = require('fs');
const path = require('path');

const prdPath = path.join(process.cwd(), '.gm', 'prd.yml');
const content = fs.readFileSync(prdPath, 'utf8');

const updated = content.replace(
  /- id: codeinsight-search-skill-parity\n  subject: Migrate codeinsight \+ search from session-start hook to gm-execute skill\n  status: pending/,
  `- id: codeinsight-search-skill-parity\n  subject: Migrate codeinsight + search from session-start hook to gm-execute skill\n  status: completed`
);

fs.writeFileSync(prdPath, updated);
console.log('PRD item marked as completed');
console.log('Updated content:');
console.log(updated);
