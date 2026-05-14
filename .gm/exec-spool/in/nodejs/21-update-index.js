const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'gm-skill', 'index.js');
const content = fs.readFileSync(indexPath, 'utf8');

console.log('[update-index] Current gm-skill/index.js:');
console.log(content);

const manifest = require(path.join(process.cwd(), 'gm-skill', 'lib', 'manifest.js'));

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

console.log('\n[update-index] Updated gm-skill/index.js:');
console.log(newContent);

const reloaded = require(indexPath);
console.log('\n[update-index] Verifying exports:');
console.log(`  ✓ spool: ${typeof reloaded.spool === 'object'}`);
console.log(`  ✓ manifest: ${typeof reloaded.manifest === 'object'}`);
console.log(`  ✓ manifest.getManifest: ${typeof reloaded.manifest.getManifest === 'function'}`);
console.log(`  ✓ manifest.getAllSkills: ${typeof reloaded.manifest.getAllSkills === 'function'}`);

console.log('\n[update-index] COMPLETE - index.js updated with manifest export');
