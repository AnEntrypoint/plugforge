const fs = require('fs');
const path = require('path');

console.log('=== Documentation Files ===\n');

const docsDir = 'C:\\dev\\gm\\docs';

function listDir(dir, indent = '') {
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        console.log(`${indent}📁 ${item}/`);
        if (!item.startsWith('.')) {
          listDir(fullPath, indent + '  ');
        }
      } else if (item.endsWith('.md') || item.endsWith('.html')) {
        console.log(`${indent}📄 ${item}`);
      }
    });
  } catch (e) {
    console.log(`${indent}Error reading ${dir}: ${e.message}`);
  }
}

listDir(docsDir);

console.log('\n--- Checking main doc files for hook references ---');

const mainFiles = [
  'C:\\dev\\gm\\docs\\index.html',
  'C:\\dev\\gm\\docs\\api.html',
  'C:\\dev\\gm\\README.md'
];

mainFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const hookLines = [];
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('hook') && !line.includes('github')) {
          hookLines.push(`  Line ${idx + 1}: ${line.slice(0, 100)}`);
        }
      });

      console.log(`\n${file}:`);
      if (hookLines.length > 0) {
        console.log(`  Hook references found: ${hookLines.length}`);
        hookLines.slice(0, 3).forEach(l => console.log(l));
        if (hookLines.length > 3) {
          console.log(`  ... and ${hookLines.length - 3} more`);
        }
      } else {
        console.log('  ✓ No hook references');
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
});
