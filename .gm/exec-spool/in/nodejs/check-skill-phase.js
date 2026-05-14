const fs = require('fs');
const path = require('path');

const gmDir = 'C:\\dev\\gm\\.gm';

console.log('[check-skill-phase] Determining current skill execution phase\n');

// Check marker files
const markers = {
  'needs-gm': 'PRD needs gm skill execution',
  'gm-fired-this-turn': 'gm skill has fired this turn',
  'residual-check-fired': 'Residual scan gate has fired',
  '.gm-stop-verified': 'Session stop verification done'
};

const presentMarkers = [];
const absentMarkers = [];

Object.entries(markers).forEach(([marker, meaning]) => {
  const markerPath = path.join(gmDir, marker);
  if (fs.existsSync(markerPath)) {
    presentMarkers.push(`${marker}: ${meaning}`);
  } else {
    absentMarkers.push(`${marker}: ${meaning}`);
  }
});

console.log('PRESENT markers:');
if (presentMarkers.length > 0) {
  presentMarkers.forEach(m => console.log(`  ✓ ${m}`));
} else {
  console.log('  (none)');
}

console.log('\nABSENT markers:');
absentMarkers.forEach(m => console.log(`  ✗ ${m}`));

// Infer current phase
console.log('\n[check-skill-phase] INFERRED PHASE:');

if (presentMarkers.some(m => m.includes('needs-gm'))) {
  console.log('  → PRD exists and needs gm execution');
  console.log('  → PHASE: waiting for gm skill invocation');
} else if (presentMarkers.some(m => m.includes('gm-fired'))) {
  console.log('  → gm has already fired this turn');
  console.log('  → PHASE: post-gm execution (tools available)');
} else if (presentMarkers.some(m => m.includes('residual'))) {
  console.log('  → Residual check has fired');
  console.log('  → PHASE: post-work residual assessment');
} else {
  console.log('  → No active markers');
  console.log('  → PHASE: autonomous/skill-completion phase');
}

// Check PRD contents
const prdFile = path.join(gmDir, 'prd.yml');
if (fs.existsSync(prdFile)) {
  const prdContent = fs.readFileSync(prdFile, 'utf8');
  const items = prdContent.match(/- id:/g);
  console.log(`\n[check-skill-phase] PRD has ${items ? items.length : 0} items (pending execution)`);
}
