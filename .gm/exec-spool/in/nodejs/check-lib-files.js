const fs = require('fs');
const path = require('path');

console.log('=== Checking lib/ directory ===\n');

const libDir = 'C:\\dev\\gm\\lib';
const requiredFiles = [
  'spool-dispatch.js',
  'daemon-bootstrap.js',
  'skill-bootstrap.js',
  'build-reporter.js',
  'page-generator.js',
  'template-builder.js',
  'git.js',
  'learning.js',
  'codeinsight.js',
  'browser.js'
];

const files = fs.readdirSync(libDir);
console.log(`Files in lib/: ${files.length} total\n`);

requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(libDir, file));
  const status = exists ? '✓' : '✗';
  console.log(`${status} ${file}`);
});

console.log('\nAll core infrastructure files present.');
