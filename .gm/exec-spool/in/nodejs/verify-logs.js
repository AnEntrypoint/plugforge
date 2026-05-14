const fs = require('fs');
const path = require('path');
const os = require('os');

const logDir = path.join(os.homedir(), '.claude', 'gm-log');
const gmStateDir = path.join(os.homedir(), '.gm');

console.log('Log directory:', logDir);
console.log('Exists:', fs.existsSync(logDir));

console.log('\nGM state directory:', gmStateDir);
console.log('Exists:', fs.existsSync(gmStateDir));

if (fs.existsSync(logDir)) {
  const files = fs.readdirSync(logDir);
  console.log('Files in log dir:', files);

  files.forEach(f => {
    const subdir = path.join(logDir, f);
    if (fs.statSync(subdir).isDirectory()) {
      const subfiles = fs.readdirSync(subdir);
      console.log(`  ${f}/:`, subfiles);
    }
  });
}

if (fs.existsSync(gmStateDir)) {
  const files = fs.readdirSync(gmStateDir).filter(f => f.endsWith('-status.json'));
  console.log('Status files in .gm:', files);
}
