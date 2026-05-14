const fs = require('fs');
const path = require('path');

const hookDir = 'C:\\dev\\rs-plugkit\\src\\hook';
const files = fs.readdirSync(hookDir)
  .filter(f => f.endsWith('.rs'))
  .sort();

console.log('Hook files in rs-plugkit:');
files.forEach(f => console.log('  ' + f));
