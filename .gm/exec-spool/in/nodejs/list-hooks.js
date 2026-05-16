const fs = require('fs');
const path = require('path');

const hookDir = 'C:\\dev\\rs-plugkit\\src\\hook';
if (fs.existsSync(hookDir)) {
  const files = fs.readdirSync(hookDir).filter(f => f.endsWith('.rs'));
  files.forEach(f => {
    const p = path.join(hookDir, f);
    const stat = fs.statSync(p);
    console.log(`${f}: ${stat.size} bytes`);
  });
} else {
  console.log('Hook dir missing');
}
