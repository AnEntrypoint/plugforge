const fs = require('fs');
const path = require('path');

const agentsPath = 'C:\\dev\\gm\\AGENTS.md';
const content = fs.readFileSync(agentsPath, 'utf-8');

const lines = content.split('\n');
const hookMatches = [];

lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('hook') && !line.includes('**Hook denials')) {
    hookMatches.push({
      lineNum: idx + 1,
      text: line.trim().substring(0, 100)
    });
  }
});

if (hookMatches.length === 0) {
  console.log('✓ No remaining hook references found in AGENTS.md');
  process.exit(0);
} else {
  console.log(`Found ${hookMatches.length} remaining hook references:\n`);
  hookMatches.forEach(m => {
    console.log(`Line ${m.lineNum}: ${m.text}`);
  });
  process.exit(1);
}
