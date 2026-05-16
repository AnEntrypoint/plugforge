const fs = require('fs');
const path = require('path');

const dirs = [
  'C:\\dev\\rs-plugkit\\src',
];

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`\n=== ${dir} ===`);
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      const s = fs.statSync(p);
      const type = s.isDirectory() ? 'dir' : 'file';
      console.log(`${type.padEnd(5)} ${f}`);
    });
  }
});
