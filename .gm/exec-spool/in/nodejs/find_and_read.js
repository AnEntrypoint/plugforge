const fs = require('fs');
const path = require('path');

const libPath = path.join(process.cwd(), 'gm-starter', 'lib');
const files = fs.readdirSync(libPath).filter(f => f.endsWith('.js'));

console.log(`Found ${files.length} JS files:`);
files.forEach(f => console.log('  ' + f));

if (files.length === 0) {
  console.log('\nNo JS files found in lib');
  process.exit(1);
}

const firstFile = files[0];
const filePath = path.join(libPath, firstFile);
const content = fs.readFileSync(filePath, 'utf8');

console.log(`\n=== ${firstFile} (first 2000 chars) ===`);
console.log(content.substring(0, 2000));

console.log('\n=== Looking for daemon-bootstrap.js specifically ===');
const daemonPath = path.join(libPath, 'daemon-bootstrap.js');
if (fs.existsSync(daemonPath)) {
  console.log('daemon-bootstrap.js EXISTS');
  const daemonContent = fs.readFileSync(daemonPath, 'utf8');
  console.log(`Size: ${daemonContent.length} bytes`);
  console.log('First 1500 chars:');
  console.log(daemonContent.substring(0, 1500));
} else {
  console.log('daemon-bootstrap.js does NOT exist - needs to be created');
}
