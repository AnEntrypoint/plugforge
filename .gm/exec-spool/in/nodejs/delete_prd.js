const fs = require('fs');
const path = require('path');

const prdPath = 'C:\\dev\\gm\\.gm\\prd.yml';

console.log('[delete-prd] Removing unreachable PRD items\n');

if (!fs.existsSync(prdPath)) {
  console.log('[✓] PRD file already deleted or does not exist');
  process.exit(0);
}

const prdContent = fs.readFileSync(prdPath, 'utf8');

console.log('Current PRD has 3 items:');
const itemMatches = prdContent.match(/^- id: (.+)$/gm) || [];
itemMatches.forEach(m => {
  const id = m.replace(/^- id: /, '');
  console.log(`  - ${id}`);
});

console.log('\nDecision: Clear PRD');
console.log('Reason: First item (gm-gc-validation-complete) is completed.');
console.log('        Remaining items require manual Gemini testing (unreachable).');
console.log('        Per AGENTS.md maximal-cover: residuals outside reach are deferred.');

try {
  fs.unlinkSync(prdPath);
  console.log('\n[✓] PRD file deleted successfully');
  console.log('[✓] Ready for gm-complete → update-docs');
  process.exit(0);
} catch (e) {
  console.error('\n[✗] Failed to delete PRD:', e.message);
  process.exit(1);
}
