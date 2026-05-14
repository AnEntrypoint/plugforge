const fs = require('fs');
const path = require('path');

const libPath = path.join(process.cwd(), 'gm-starter', 'lib');
const files = fs.readdirSync(libPath).filter(f => f.endsWith('.js')).sort();

console.log(`Files in gm-starter/lib/ (${files.length} total):`);
files.forEach(f => console.log('  ' + f));

const daemonPath = path.join(libPath, 'daemon-bootstrap.js');
console.log(`\ndaemon-bootstrap.js exists: ${fs.existsSync(daemonPath)}`);

console.log('\nLooking for session-start hook references in source:');
const hooksPath = path.join(process.cwd(), 'gm-starter', 'hooks');
if (fs.existsSync(hooksPath)) {
  const hookFiles = fs.readdirSync(hooksPath);
  console.log('Hook files:', hookFiles);
  hookFiles.forEach(f => {
    const p = path.join(hooksPath, f);
    if (f.endsWith('.js') || f.endsWith('.json')) {
      const content = fs.readFileSync(p, 'utf8');
      if (/codeinsight|search|rs-/i.test(content)) {
        console.log(`  ${f} mentions daemon/rs modules`);
      }
    }
  });
}
