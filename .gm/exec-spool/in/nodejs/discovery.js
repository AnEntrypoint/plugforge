const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const libPath = path.join(process.cwd(), 'gm-starter', 'lib');

console.log('=== Directory Contents ===');
const files = fs.readdirSync(libPath);
console.log(`Total files: ${files.length}\n`);

const jsFiles = files.filter(f => f.endsWith('.js')).sort();
console.log('JavaScript files:');
jsFiles.forEach(f => {
  const p = path.join(libPath, f);
  const size = fs.statSync(p).size;
  console.log(`  ${f} (${size} bytes)`);
});

console.log('\n=== Searching for daemon or bootstrap in any JS file ===');
let found = false;
jsFiles.forEach(f => {
  const p = path.join(libPath, f);
  const content = fs.readFileSync(p, 'utf8');
  if (content.includes('daemon') || content.includes('Daemon') || content.includes('bootstrap') || content.includes('Bootstrap')) {
    console.log(`\nMatches in ${f}:`);
    content.split('\n').forEach((line, i) => {
      if (/daemon|bootstrap/i.test(line)) {
        console.log(`  Line ${i + 1}: ${line.trim()}`);
      }
    });
    found = true;
  }
});

if (!found) {
  console.log('No daemon or bootstrap references found');
}

console.log('\n=== Searching for rs-codeinsight or rs-search ===');
jsFiles.forEach(f => {
  const p = path.join(libPath, f);
  const content = fs.readFileSync(p, 'utf8');
  if (/rs-codeinsight|rs-search|codeinsight|search/i.test(content)) {
    console.log(`Found in ${f}`);
    content.split('\n').forEach((line, i) => {
      if (/rs-codeinsight|rs-search|codeinsight.*spawn|search.*spawn/i.test(line)) {
        console.log(`  Line ${i + 1}: ${line.trim().substring(0, 120)}`);
      }
    });
  }
});
