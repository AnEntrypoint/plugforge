const fs = require('fs');
const path = require('path');

console.log('[witness-gm-gc-state] Verify all gm-gc validation mutables reached witnessed status\n');

const mutablesPath = 'C:\\dev\\gm\\.gm\\mutables.yml';

// Read mutables
const mutables = fs.readFileSync(mutablesPath, 'utf8');

// Expected gm-gc validation mutables
const gcMutables = [
  'gm-gc-build-exists',
  'gm-gc-agents-complete',
  'gm-gc-hooks-configured',
  'gm-gc-skill-parity',
  'gm-gc-spool-helpers-available',
  'gm-gc-daemon-integration',
  'gm-gc-gemini-ready',
  'gm-gc-help-works',
  'gm-gc-installation-tested'
];

console.log('Checking gm-gc validation mutables:\n');

let allWitnessed = true;
let processedCount = 0;

gcMutables.forEach(id => {
  if (mutables.includes(`id: ${id}`)) {
    processedCount++;
    // Extract the mutable entry
    const startIdx = mutables.indexOf(`id: ${id}`);
    const nextIdx = mutables.indexOf('\n- id:', startIdx + 1);
    const endIdx = nextIdx === -1 ? mutables.length : nextIdx;
    const entry = mutables.substring(startIdx, endIdx);

    const isWitnessed = entry.includes('status: witnessed');
    const hasEvidence = entry.includes('witness_evidence:') && !entry.includes('witness_evidence: ""');

    if (isWitnessed) {
      console.log(`[✓] ${id}`);
      if (hasEvidence) {
        console.log(`    Evidence: ${entry.match(/witness_evidence: "([^"]{0,80})/)?.[1] || '(present)'}`);
      }
    } else {
      console.log(`[✗] ${id} - NOT WITNESSED`);
      allWitnessed = false;
    }
  } else {
    console.log(`[?] ${id} - NOT FOUND`);
  }
});

console.log(`\nProcessed: ${processedCount}/${gcMutables.length} gm-gc validation mutables\n`);

// Check for any unknown mutables globally (blocking check)
const unknownMatches = mutables.match(/- id: [^\n]+\n(?:[^\n]+\n)*\s+status: unknown/g) || [];
console.log(`Total unknown mutables in file: ${unknownMatches.length}`);

if (unknownMatches.length > 0) {
  console.log('\nUnknown mutables (blocking work):');
  unknownMatches.slice(0, 5).forEach(m => {
    const idMatch = m.match(/- id: ([^\n]+)/);
    console.log(`  - ${idMatch ? idMatch[1] : '(unknown)'}`);
  });

  if (unknownMatches.length > 5) {
    console.log(`  ... and ${unknownMatches.length - 5} more`);
  }
  console.log('\n[✗] BLOCKING: Unknown mutables must be witnessed before proceeding');
  process.exit(1);
}

// Determine readiness
console.log('\n=== WITNESS STATUS ===');
if (allWitnessed && processedCount === gcMutables.length) {
  console.log('[✓] All gm-gc validation mutables witnessed and ready for emit');
  process.exit(0);
} else if (processedCount > 0) {
  console.log(`[⚠] Partial completion: ${processedCount}/${gcMutables.length} witnessed`);
  if (!allWitnessed) {
    console.log('[✗] Some gm-gc mutables not yet witnessed - need additional witnesses');
    process.exit(1);
  } else {
    process.exit(0);
  }
} else {
  console.log('[⚠] No gm-gc mutables found in file');
  process.exit(1);
}
