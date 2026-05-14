const path = require('path');

const skillPath = 'C:\\dev\\gm\\gm-skill';
const daemonBootstrapPath = path.join(skillPath, 'lib', 'daemon-bootstrap.js');

try {
  const daemonBootstrap = require(daemonBootstrapPath);

  console.log('✓ daemon-bootstrap.js imported successfully');
  console.log('Exported functions:', Object.keys(daemonBootstrap).sort());

  const required = ['checkState', 'spawn', 'waitForReady', 'getSocket', 'shutdown'];
  const missing = required.filter(fn => !daemonBootstrap[fn]);

  if (missing.length > 0) {
    console.error('✗ Missing functions:', missing);
    process.exit(1);
  }

  console.log('✓ All required functions exported');

  const funcTypes = {};
  for (const fn of required) {
    funcTypes[fn] = typeof daemonBootstrap[fn];
  }
  console.log('Function types:', funcTypes);

  if (Object.values(funcTypes).every(t => t === 'function')) {
    console.log('✓ All required functions are callable');
  } else {
    console.error('✗ Not all exports are functions');
    process.exit(1);
  }

  console.log('\n✓ daemon-bootstrap.js verification PASSED');
} catch (e) {
  console.error('✗ Failed to import daemon-bootstrap:', e.message);
  console.error(e.stack);
  process.exit(1);
}
