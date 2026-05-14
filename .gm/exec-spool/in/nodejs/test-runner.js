const { execSync } = require('child_process');
try {
  console.log('Running gm-skill tests...');
  execSync('cd C:\\dev\\gm\\gm-skill && npm test', { stdio: 'inherit', timeout: 30000 });
  console.log('\nPASS: gm-skill test suite passed');
} catch (e) {
  console.error('FAIL: test suite failed');
  process.exit(1);
}
