const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';
const files = fs.readdirSync(outDir).sort((a, b) => {
  const aNum = parseInt(a.split('.')[0]);
  const bNum = parseInt(b.split('.')[0]);
  return bNum - aNum;
});

console.log('Latest files in spool out/:');
files.slice(0, 10).forEach(f => {
  const fullPath = path.join(outDir, f);
  const stat = fs.statSync(fullPath);
  console.log(`${f} (${stat.size} bytes, modified ${new Date(stat.mtime).toISOString()})`);
});
