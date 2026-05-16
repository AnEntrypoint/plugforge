const fs = require('fs');
const path = require('path');

const dirs = [
  'C:\\dev\\rs-plugkit\\src\\hook',
  'C:\\dev\\gm\\gm-starter\\lib',
  'C:\\dev\\gm\\.gm',
  'C:\\dev\\rs-exec\\src',
  'C:\\dev\\rs-learn\\src',
  'C:\\dev\\rs-codeinsight\\src'
];

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`\n=== ${dir} ===`);
    try {
      fs.readdirSync(dir).slice(0, 20).forEach(f => console.log(f));
    } catch (e) {
      console.error(e.message);
    }
  }
});
