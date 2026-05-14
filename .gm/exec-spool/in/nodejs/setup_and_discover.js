const fs = require('fs');
const path = require('path');

const libPath = path.join(process.cwd(), 'gm-starter', 'lib');
const daemonPath = path.join(libPath, 'daemon-bootstrap.js');

console.log('daemon-bootstrap.js exists:', fs.existsSync(daemonPath));

if (!fs.existsSync(daemonPath)) {
  console.log('File will need to be created');
}

const skillBootstrapPath = path.join(libPath, 'skill-bootstrap.js');
const skillContent = fs.readFileSync(skillBootstrapPath, 'utf8');

console.log('\n=== skill-bootstrap.js structure ===');
const functionMatches = skillContent.match(/^(async )?function \w+/gm);
console.log('Functions:', functionMatches ? functionMatches.map(f => f.replace(/^async /, '')) : 'none');

const exportLine = skillContent.match(/module\.exports = .*/);
console.log('Exports:', exportLine ? exportLine[0] : 'none');
