const fs = require('fs');
const path = require('path');

const files = [
  'README.md',
  'AGENTS.md',
  'docs/index.html',
  'gm-starter/agents/gm.md'
];

files.forEach(f => {
  const fullPath = path.join(process.cwd(), f);
  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      console.log(`\n=== ${f} (${content.length} bytes) ===\n`);
      console.log(content.substring(0, 1500));
      if (content.length > 1500) {
        console.log(`\n... [truncated, ${content.length - 1500} more bytes] ...\n`);
      }
    } else {
      console.log(`\nMISSING: ${f}\n`);
    }
  } catch (e) {
    console.log(`\nERROR reading ${f}: ${e.message}\n`);
  }
});
