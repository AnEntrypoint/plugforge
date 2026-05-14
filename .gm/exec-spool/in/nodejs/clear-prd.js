const fs = require('fs');
const path = require('path');

const prdPath = '/c/dev/gm/.gm/prd.yml';

try {
  if (fs.existsSync(prdPath)) {
    fs.unlinkSync(prdPath);
    console.log('.gm/prd.yml deleted successfully');
  } else {
    console.log('.gm/prd.yml not found (already deleted or never created)');
  }
  process.exit(0);
} catch (e) {
  console.error('FAILED to delete .gm/prd.yml:', e.message);
  process.exit(1);
}
