const fs = require('fs');
const path = require('path');

const daemonPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');
const exists = fs.existsSync(daemonPath);

console.log('daemon-bootstrap.js exists:', exists);

if (exists) {
  const content = fs.readFileSync(daemonPath, 'utf8');
  console.log('File size:', content.length, 'bytes');
  console.log('Has ensureRsCodeinsightDaemonRunning:', /ensureRsCodeinsightDaemonRunning/.test(content));
  console.log('Has ensureRsSearchDaemonRunning:', /ensureRsSearchDaemonRunning/.test(content));
  console.log('Has computeDigest:', /function computeDigest/.test(content));
  console.log('Has isProcessRunning:', /function isProcessRunning/.test(content));

  const exportMatch = content.match(/module\.exports = \{([^}]+)\}/);
  if (exportMatch) {
    console.log('Exports:', exportMatch[1].split(',').map(s => s.trim()));
  }
}
