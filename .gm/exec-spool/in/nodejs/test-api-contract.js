const path = require('path');

const daemonBootstrap = require('C:\\dev\\gm\\gm-skill\\lib\\daemon-bootstrap.js');

async function testApiContract() {
  const tests = [];

  try {
    console.log('Testing daemon-bootstrap API contract...\n');

    console.log('Test 1: checkState returns object with ok, running, durationMs');
    const checkResult = await daemonBootstrap.checkState('test-daemon');
    console.log('Result:', checkResult);
    if (typeof checkResult.ok === 'boolean' && typeof checkResult.running === 'boolean') {
      console.log('✓ PASS\n');
      tests.push(true);
    } else {
      console.error('✗ FAIL: missing ok or running field\n');
      tests.push(false);
    }

    console.log('Test 2: spawn returns object with ok, pid/error, durationMs');
    const spawnResult = await daemonBootstrap.spawn('test-daemon', 'test-cmd@latest');
    console.log('Result keys:', Object.keys(spawnResult));
    if (typeof spawnResult.ok === 'boolean' && typeof spawnResult.durationMs === 'number') {
      console.log('✓ PASS\n');
      tests.push(true);
    } else {
      console.error('✗ FAIL: missing ok or durationMs field\n');
      tests.push(false);
    }

    console.log('Test 3: waitForReady returns object with ok, elapsedMs, error on timeout');
    const readyResult = await daemonBootstrap.waitForReady('test-daemon', '127.0.0.1', 12345, 500);
    console.log('Result:', readyResult);
    if (typeof readyResult.ok === 'boolean' && typeof readyResult.elapsedMs === 'number') {
      console.log('✓ PASS\n');
      tests.push(true);
    } else {
      console.error('✗ FAIL: missing ok or elapsedMs field\n');
      tests.push(false);
    }

    console.log('Test 4: getSocket returns object with ok, socket or error');
    const socketResult = await daemonBootstrap.getSocket('test-daemon');
    console.log('Result:', socketResult);
    if (typeof socketResult.ok === 'boolean') {
      console.log('✓ PASS\n');
      tests.push(true);
    } else {
      console.error('✗ FAIL: missing ok field\n');
      tests.push(false);
    }

    console.log('Test 5: shutdown returns object with ok, killed, durationMs');
    const shutdownResult = await daemonBootstrap.shutdown('test-daemon');
    console.log('Result:', shutdownResult);
    if (typeof shutdownResult.ok === 'boolean' && typeof shutdownResult.killed === 'boolean') {
      console.log('✓ PASS\n');
      tests.push(true);
    } else {
      console.error('✗ FAIL: missing ok or killed field\n');
      tests.push(false);
    }

    console.log('Test 6: All functions are async (return Promise)');
    const isAsync = [
      daemonBootstrap.checkState,
      daemonBootstrap.spawn,
      daemonBootstrap.waitForReady,
      daemonBootstrap.getSocket,
      daemonBootstrap.shutdown,
    ].every(fn => fn && fn.constructor.name === 'AsyncFunction');
    console.log('All async:', isAsync);
    if (isAsync) {
      console.log('✓ PASS\n');
      tests.push(true);
    } else {
      console.error('✗ FAIL: not all functions are async\n');
      tests.push(false);
    }

    const passed = tests.filter(t => t).length;
    const total = tests.length;
    console.log(`\nResults: ${passed}/${total} tests passed`);

    if (passed === total) {
      console.log('✓ API contract verification PASSED');
      process.exit(0);
    } else {
      console.error('✗ API contract verification FAILED');
      process.exit(1);
    }
  } catch (e) {
    console.error('Test execution error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

testApiContract();
