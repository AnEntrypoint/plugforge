const fs = require('fs');
const path = require('path');

const skillDir = 'C:\\dev\\gm\\gm-skill';
function walkDir(dir, depth = 0) {
  if (depth > 3) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const indent = '  '.repeat(depth);
      if (entry.isDirectory()) {
        console.log(`${indent}${entry.name}/`);
        walkDir(fullPath, depth + 1);
      } else {
        console.log(`${indent}${entry.name}`);
      }
    }
  } catch (e) {
    console.error(`Error reading ${dir}: ${e.message}`);
  }
}

console.log('gm-skill directory structure:');
walkDir(skillDir);
