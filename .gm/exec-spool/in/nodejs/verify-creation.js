const fs = require('fs');
const path = require('path');

const daemonBootstrapPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');
console.log('Checking:', daemonBootstrapPath);
console.log('Exists:', fs.existsSync(daemonBootstrapPath));

if (fs.existsSync(daemonBootstrapPath)) {
  const stat = fs.statSync(daemonBootstrapPath);
  console.log('Size:', stat.size, 'bytes');

  const content = fs.readFileSync(daemonBootstrapPath, 'utf8');
  console.log('Lines:', content.split('\n').length);
  console.log('\nFunction exports:');
  const exportMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\}/s);
  if (exportMatch) {
    const exports = exportMatch[1].split(',').map(e => e.trim());
    exports.forEach(e => console.log('  -', e));
  }

  console.log('\nKey features:');
  console.log('  - checkPortReachable (net.Socket):', content.includes('new net.Socket()'));
  console.log('  - ensureAcptoapiRunning:', content.includes('async function ensureAcptoapiRunning()'));
  console.log('  - spawn with detached:', content.includes('detached: true'));
  console.log('  - spawn with stdio ignore:', content.includes("stdio: 'ignore'"));
  console.log('  - windowsHide flag:', content.includes('windowsHide: true'));
  console.log('  - SESSION_ID threading:', content.includes('CLAUDE_SESSION_ID'));
  console.log('  - Status file writing:', content.includes('writeStatusFile'));
  console.log('  - Error handling (fallback):', content.includes('fallback'));
}
