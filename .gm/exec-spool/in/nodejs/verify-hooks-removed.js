const fs = require('fs');
const path = require('path');

const templateBuilder = path.join('C:\\dev\\gm\\lib\\template-builder.js');
const content = fs.readFileSync(templateBuilder, 'utf-8');

console.log('=== Searching template-builder.js for hooks references ===\n');

const lines = content.split('\n');
let hooksRefs = [];

lines.forEach((line, idx) => {
  if (line.includes('hooks') && !line.includes('// ') && !line.includes('getHookSourcePaths')) {
    hooksRefs.push(`Line ${idx + 1}: ${line.trim()}`);
  }
});

if (hooksRefs.length === 0) {
  console.log('✓ No hooks references found in template-builder.js');
} else {
  console.log('Found hooks references:');
  hooksRefs.forEach(ref => console.log(`  ${ref}`));
}
