const fs = require('fs');
const path = require('path');

console.log('=== Checking Docs Structure ===\n');

const docsDir = 'C:\\dev\\gm\\docs';

if (!fs.existsSync(docsDir)) {
  console.log('docs/ directory not found');
  process.exit(0);
}

console.log('Files and directories in docs/:\n');

const items = fs.readdirSync(docsDir);

items.forEach(item => {
  const fullPath = path.join(docsDir, item);
  const stat = fs.statSync(fullPath);
  const type = stat.isDirectory() ? '[DIR]' : '[FILE]';
  console.log(`${type} ${item}`);
});

console.log('\n--- Checking for hook-related documentation ---');

const filesToCheck = [
  'docs/index.html',
  'docs/architecture.html',
  'docs/api/index.html'
];

filesToCheck.forEach(file => {
  const fullPath = path.join('C:\\dev\\gm', file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const hookMatches = content.match(/hook/gi) || [];
    const spoolMatches = content.match(/spool/gi) || [];

    console.log(`\n${file}:`);
    console.log(`  - "hook" references: ${hookMatches.length}`);
    console.log(`  - "spool" references: ${spoolMatches.length}`);
  }
});
