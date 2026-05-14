const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const mutsPath = path.join(process.cwd(), '.gm', 'mutables.yml');
const mutsText = fs.readFileSync(mutsPath, 'utf8');
const muts = yaml.parse(mutsText) || [];

const gmGcMuts = muts.filter(m => m.id.startsWith('gm-gc-'));

console.log(`CRITERION 2: Witness evidence filled`);

let allFilled = true;
gmGcMuts.forEach(m => {
  const hasEvidence = m.witness_evidence && m.witness_evidence.trim().length > 0;
  if (!hasEvidence) {
    allFilled = false;
    console.log(`${m.id}: MISSING EVIDENCE`);
  } else {
    console.log(`${m.id}: OK (${m.witness_evidence.length} chars)`);
  }
});

console.log(`\nCRITERION 2 PASS: ${allFilled}`);
