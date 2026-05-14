const fs = require('fs');
const path = require('path');

const spoolPath = '/c/dev/gm/gm-starter/lib/spool.js';

try {
  if (!fs.existsSync(spoolPath)) {
    console.log(JSON.stringify({ exists: false, error: 'spool.js not found' }, null, 2));
    process.exit(0);
  }

  const content = fs.readFileSync(spoolPath, 'utf-8');
  const exports = ['writeSpool', 'readSpoolOutput', 'waitForCompletion', 'getAllOutputs'];

  const hasExports = exports.filter(exp =>
    content.includes(`exports.${exp}`) || content.includes(`export.*${exp}`)
  );

  console.log(JSON.stringify({
    exists: true,
    exports_found: hasExports,
    all_exports_present: hasExports.length === exports.length,
    file_length: content.length
  }, null, 2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
