const fs = require('fs');
const path = require('path');

const prdPath = path.join(process.cwd(), '.gm', 'prd.yml');

if (fs.existsSync(prdPath)) {
  fs.unlinkSync(prdPath);
  console.log('✓ Removed .gm/prd.yml');
} else {
  console.log('✓ .gm/prd.yml already absent');
}

process.exit(0);
