const fs = require('fs');
const path = require('path');

const daemonPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');

console.log(`CRITERION 6: Daemon bootstrap integration`);
console.log(`Checking ${daemonPath}`);

const exists = fs.existsSync(daemonPath);
console.log(`daemon-bootstrap.js exists: ${exists ? 'YES' : 'NO'}`);

if (!exists) {
  console.log(`CRITERION 6 PASS: false`);
  process.exit(1);
}

const daemonCode = fs.readFileSync(daemonPath, 'utf8');
const hasCheckState = daemonCode.includes('checkState');
const hasSpawn = daemonCode.includes('spawn');
const hasWaitForReady = daemonCode.includes('waitForReady');
const hasGetSocket = daemonCode.includes('getSocket');
const hasShutdown = daemonCode.includes('shutdown');

console.log(`Required exports:`);
console.log(`  checkState: ${hasCheckState ? 'YES' : 'NO'}`);
console.log(`  spawn: ${hasSpawn ? 'YES' : 'NO'}`);
console.log(`  waitForReady: ${hasWaitForReady ? 'YES' : 'NO'}`);
console.log(`  getSocket: ${hasGetSocket ? 'YES' : 'NO'}`);
console.log(`  shutdown: ${hasShutdown ? 'YES' : 'NO'}`);

const pass = hasCheckState && hasSpawn && hasWaitForReady && hasGetSocket && hasShutdown;
console.log(`\nCRITERION 6 PASS: ${pass}`);
