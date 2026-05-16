const fs = require('fs');
const path = require('path');

const gmDir = process.env.CLAUDE_PROJECT_DIR
  ? path.join(process.env.CLAUDE_PROJECT_DIR, '.gm')
  : path.join(process.env.HOME || process.env.USERPROFILE, '.gm');

console.log('GM Dir:', gmDir);
console.log('Checking marker files...');

const prdPath = path.join(gmDir, 'prd.yml');
console.log('PRD exists:', fs.existsSync(prdPath));

const mutsPath = path.join(gmDir, 'mutables.yml');
console.log('Mutables exists:', fs.existsSync(mutsPath));

const needsPath = path.join(gmDir, 'needs-gm');
console.log('Needs-gm exists:', fs.existsSync(needsPath));

const gmFiredPath = path.join(gmDir, 'gm-fired-1');
console.log('GM-fired-1 exists:', fs.existsSync(gmFiredPath));

console.log('Marker file check successful');
process.exit(0);
