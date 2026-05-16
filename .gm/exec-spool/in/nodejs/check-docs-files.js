const fs = require('fs');
const path = require('path');

console.log('=== Checking docs/ directory ===\n');

const docsDir = 'C:\\dev\\gm\\docs';

if (!fs.existsSync(docsDir)) {
  console.log('✗ docs/ directory does not exist');
  process.exit(0);
}

console.log('✓ docs/ directory exists\n');

function walkDir(dir, prefix = '') {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    if (item.startsWith('.')) return;

    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      console.log(`${prefix}📁 ${item}/`);
      if (item !== 'node_modules' && item !== '.git') {
        walkDir(fullPath, prefix + '  ');
      }
    } else if (item.endsWith('.html') || item.endsWith('.md') || item.endsWith('.json')) {
      console.log(`${prefix}📄 ${item}`);
    }
  });
}

walkDir(docsDir);

// Check for hook references in key files
console.log('\n=== Checking for hook references in docs ===\n');

const indexPath = path.join(docsDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf-8');
  const hookCount = (content.match(/hook/gi) || []).length;
  const spoolCount = (content.match(/spool/gi) || []).length;

  console.log(`docs/index.html:`);
  console.log(`  "hook" references: ${hookCount}`);
  console.log(`  "spool" references: ${spoolCount}`);
} else {
  console.log('docs/index.html not found');
}

console.log('\n✓ Docs check complete');
