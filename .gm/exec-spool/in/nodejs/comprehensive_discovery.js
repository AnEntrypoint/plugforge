const fs = require('fs');
const path = require('path');

console.log('=== Checking daemon-bootstrap.js ===');
const daemonPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');
console.log('Exists:', fs.existsSync(daemonPath));

console.log('\n=== Listing gm-starter/lib ===');
const libPath = path.join(process.cwd(), 'gm-starter', 'lib');
const files = fs.readdirSync(libPath).filter(f => f.endsWith('.js')).sort();
console.log('JS files:', files);

console.log('\n=== Reading skill-bootstrap.js to understand pattern ===');
const skillBootstrapPath = path.join(libPath, 'skill-bootstrap.js');
if (fs.existsSync(skillBootstrapPath)) {
  const content = fs.readFileSync(skillBootstrapPath, 'utf8');
  console.log('skill-bootstrap.js exists, size:', content.length);
  const lines = content.split('\n');
  console.log('Exports:', lines.filter(l => /^module\.exports|^exports/.test(l)));
}

console.log('\n=== Looking for rs-codeinsight/rs-search references ===');
files.forEach(f => {
  const p = path.join(libPath, f);
  const content = fs.readFileSync(p, 'utf8');
  if (/rs-codeinsight|rs-search/i.test(content)) {
    console.log(`Found in ${f}`);
    content.split('\n').forEach((line, i) => {
      if (/rs-codeinsight|rs-search/i.test(line)) {
        console.log(`  Line ${i + 1}: ${line.trim().substring(0, 100)}`);
      }
    });
  }
});
