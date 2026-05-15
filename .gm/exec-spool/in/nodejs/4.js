const fs = require('fs');
const path = require('path');
const os = require('os');
const pidFile = path.join(os.tmpdir(), 'gm-plugkit-spool.pid');
console.log('PID file:', pidFile);
console.log('Exists:', fs.existsSync(pidFile));
if (fs.existsSync(pidFile)) {
  const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
  console.log('PID:', pid);
  try { process.kill(pid, 0); console.log('Alive: true'); } catch (e) { console.log('Alive: false, killing stale'); fs.unlinkSync(pidFile); }
}
