const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const mutsPath = path.join(process.cwd(), '.gm', 'mutables.yml');
const mutsText = fs.readFileSync(mutsPath, 'utf8');
const muts = yaml.parse(mutsText) || [];

const gmGcMuts = muts.filter(m => m.id.startsWith('gm-gc-'));

console.log(`CRITERION 1: Count and status of gm-gc-* mutables`);
console.log(`Total gm-gc mutables: ${gmGcMuts.length}`);
console.log(`Witnessed: ${gmGcMuts.filter(m => m.status === 'witnessed').length}`);
console.log(`Unknown: ${gmGcMuts.filter(m => m.status === 'unknown').length}`);

gmGcMuts.forEach((m, i) => {
  console.log(`${i+1}. ${m.id}: ${m.status}`);
});

const pass = gmGcMuts.length === 9 && gmGcMuts.every(m => m.status === 'witnessed');
console.log(`\nCRITERION 1 PASS: ${pass}`);
