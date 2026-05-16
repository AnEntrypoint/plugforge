const fs = require('fs');
const path = require('path');

const libDir = 'C:\\dev\\gm\\lib';
const files = fs.readdirSync(libDir);

console.log('=== Searching for hooks.json generation ===\n');

files.forEach(file => {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(path.join(libDir, file), 'utf8');

    if (content.includes('hooks.json') || content.includes('buildHooksJson') || content.includes('generateHooks')) {
      console.log(`\nFile: ${file}`);

      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('hooks.json') || line.includes('buildHooksJson') || line.includes('generateHooks') || line.includes('hook-spec')) {
          console.log(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
