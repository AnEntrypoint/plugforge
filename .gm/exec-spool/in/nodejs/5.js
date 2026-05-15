const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const bin = path.join(os.homedir(), '.claude', 'gm-tools', 'plugkit.exe');
console.log('Binary:', bin);
console.log('Exists:', fs.existsSync(bin));

if (fs.existsSync(bin)) {
  const spoolIn = 'C:/dev/gm/.gm/exec-spool/in';
  const spoolOut = 'C:/dev/gm/.gm/exec-spool/out';
  fs.mkdirSync(spoolIn, { recursive: true });
  fs.mkdirSync(spoolOut, { recursive: true });

  const proc = spawn(bin, ['runner', '--watch', spoolIn, '--out', spoolOut], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: 'C:/dev/gm',
  });
  proc.unref();
  console.log('Watcher started, PID:', proc.pid);

  const pidFile = path.join(os.tmpdir(), 'gm-plugkit-spool.pid');
  fs.writeFileSync(pidFile, String(proc.pid));
} else {
  console.log('Binary not found, trying bootstrap');
  const bootstrap = require('C:/dev/gm/gm-starter/gm-plugkit/bootstrap.js');
  bootstrap.ensureReady().then(r => {
    console.log('Bootstrap result:', r);
  }).catch(e => {
    console.error('Bootstrap error:', e.message);
  });
}
