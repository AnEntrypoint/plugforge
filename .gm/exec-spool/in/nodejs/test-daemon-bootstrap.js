const path = require('path');
const daemonBootstrap = require(path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js'));

console.log('Daemon bootstrap module imported successfully');
console.log('Available functions:');
console.log('  - ensureAcptoapiRunning');
console.log('  - ensureRsLearningDaemonRunning');
console.log('  - ensureRsCodeinsightDaemonRunning');
console.log('  - ensureRsSearchDaemonRunning');
console.log('  - checkPortReachable');
console.log('  - obsEvent');
console.log('  - writeStatusFile');

(async () => {
  console.log('\nTesting checkPortReachable for invalid port...');
  const reachable = await daemonBootstrap.checkPortReachable('127.0.0.1', 9999, 100);
  console.log('Port 9999 reachable:', reachable);

  console.log('\nTesting ensureAcptoapiRunning (will try to spawn acptoapi)...');
  process.env.CLAUDE_SESSION_ID = 'test-session-123';
  process.env.CLAUDE_PROJECT_DIR = process.cwd();

  const result = await daemonBootstrap.ensureAcptoapiRunning();
  console.log('Result:', JSON.stringify(result, null, 2));

  console.log('\nTest completed');
})().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
