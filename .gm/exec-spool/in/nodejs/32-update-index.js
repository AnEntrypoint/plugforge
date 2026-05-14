const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'gm-skill', 'index.js');
const newContent = `const daemonBootstrap = require('../gm-starter/lib/daemon-bootstrap.js');
const spool = require('../gm-starter/lib/spool.js');
const manifest = require('./lib/manifest.js');

module.exports = {
  ...daemonBootstrap,
  spool,
  manifest
};
`;

fs.writeFileSync(indexPath, newContent);
console.log('[update-index] ✓ Updated gm-skill/index.js with manifest export');
