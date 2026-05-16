const fs = require('fs');
const path = require('path');

console.log('=== Testing daemon bootstrap ===\n');

const daemonBootstrapPath = 'C:\\dev\\gm\\lib\\daemon-bootstrap.js';

// Verify daemon-bootstrap.js exists
if (!fs.existsSync(daemonBootstrapPath)) {
  console.log('ERROR: lib/daemon-bootstrap.js not found');
  process.exit(1);
}

console.log('✓ lib/daemon-bootstrap.js exists');

// Load the module
let DaemonBootstrap;
try {
  DaemonBootstrap = require(daemonBootstrapPath);
  console.log('✓ DaemonBootstrap module loaded');
} catch (e) {
  console.log(`ERROR loading module: ${e.message}`);
  process.exit(1);
}

// Create instance
const bootstrap = new DaemonBootstrap();
console.log('✓ DaemonBootstrap instance created');

// Check if it has required methods
const requiredMethods = [
  'checkState',
  'spawn',
  'waitForReady',
  'getSocket',
  'shutdown',
  'shutdownAll'
];

console.log('\n--- Checking methods ---');
requiredMethods.forEach(method => {
  if (typeof bootstrap[method] === 'function') {
    console.log(`✓ ${method}()`);
  } else {
    console.log(`✗ ${method}() NOT FOUND`);
    process.exit(1);
  }
});

// Test socket configuration
console.log('\n--- Socket configuration ---');
const sockets = {
  'acptoapi': '127.0.0.1:4800',
  'rs-learn': 'http://127.0.0.1:4801',
  'rs-codeinsight': 'http://127.0.0.1:4802'
};

Object.entries(sockets).forEach(([name, expected]) => {
  const actual = bootstrap.getSocket(name);
  if (actual === expected) {
    console.log(`✓ ${name}: ${actual}`);
  } else {
    console.log(`✗ ${name}: expected ${expected}, got ${actual}`);
    process.exit(1);
  }
});

console.log('\n✓ All daemon bootstrap tests passed');
process.exit(0);
