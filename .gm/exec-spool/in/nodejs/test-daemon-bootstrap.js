const path = require('path');
const daemonBootstrap = require('C:\\dev\\gm\\gm-skill\\lib\\daemon-bootstrap.js');

async function test() {
  try {
    console.log('Testing checkState...');
    const checkResult = await daemonBootstrap.checkState('acptoapi');
    console.log('checkState result:', JSON.stringify(checkResult, null, 2));

    console.log('\nTesting spawn (dry run - would spawn bun x cmd)...');
    const spawnResult = await daemonBootstrap.spawn('test-daemon', 'acptoapi@latest');
    console.log('spawn result:', JSON.stringify(spawnResult, null, 2));

    console.log('\nTesting getSocket...');
    const socketResult = await daemonBootstrap.getSocket('acptoapi');
    console.log('getSocket result:', JSON.stringify(socketResult, null, 2));

    console.log('\nTesting waitForReady (should timeout quickly)...');
    const readyResult = await daemonBootstrap.waitForReady('test-daemon', '127.0.0.1', 9999, 1000);
    console.log('waitForReady result:', JSON.stringify(readyResult, null, 2));

    console.log('\nAll tests completed.');
  } catch (e) {
    console.error('Test failed:', e.message);
    process.exit(1);
  }
}

test();
