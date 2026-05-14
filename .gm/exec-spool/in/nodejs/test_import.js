const path = require('path');

try {
  const daemonBootstrap = require(path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js'));
  console.log('Import successful');
  console.log('Exported functions:', Object.keys(daemonBootstrap));
  console.log('ensureRsCodeinsightDaemonRunning is async:', daemonBootstrap.ensureRsCodeinsightDaemonRunning.constructor.name === 'AsyncFunction');
  console.log('ensureRsSearchDaemonRunning is async:', daemonBootstrap.ensureRsSearchDaemonRunning.constructor.name === 'AsyncFunction');
} catch (e) {
  console.error('Import failed:', e.message);
  console.error(e.stack);
  process.exit(1);
}
