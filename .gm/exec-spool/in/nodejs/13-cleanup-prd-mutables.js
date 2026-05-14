const fs = require('fs');
const path = require('path');

const gmRoot = 'C:\\dev\\gm';
const prdPath = path.join(gmRoot, '.gm', 'prd.yml');
const mutablesPath = path.join(gmRoot, '.gm', 'mutables.yml');

try {
  console.log('=== CLEANUP: DELETE PRD AND MUTABLES ===\n');

  if (fs.existsSync(prdPath)) {
    fs.unlinkSync(prdPath);
    console.log('✓ Deleted .gm/prd.yml');
  } else {
    console.log('- .gm/prd.yml already absent');
  }

  if (fs.existsSync(mutablesPath)) {
    fs.unlinkSync(mutablesPath);
    console.log('✓ Deleted .gm/mutables.yml');
  } else {
    console.log('- .gm/mutables.yml already absent');
  }

  console.log('\nAll PRD items completed. Cleanup done.');
  process.exit(0);
} catch (err) {
  console.error(`Cleanup failed: ${err.message}`);
  process.exit(1);
}
