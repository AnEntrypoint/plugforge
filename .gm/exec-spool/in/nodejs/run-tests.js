const fs = require('fs');
const path = require('path');

const testPath = '/c/dev/gm/test.js';
const moduleDir = '/c/dev/gm/node_modules';

if (!fs.existsSync(moduleDir)) {
  console.error('ERROR: node_modules not found after npm install');
  process.exit(1);
}

if (!fs.existsSync(path.join(moduleDir, 'js-yaml'))) {
  console.error('ERROR: js-yaml not in node_modules');
  process.exit(1);
}

try {
  require(testPath);
  process.exit(0);
} catch (e) {
  console.error('TEST FAILURE:', e.message);
  console.error(e.stack);
  process.exit(1);
}
