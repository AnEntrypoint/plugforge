const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.claude', 'gm-log');
const GM_STATE_DIR = path.join(os.homedir(), '.gm');

function emitDaemonEvent(daemon, severity, message, details) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logDir = path.join(LOG_DIR, date);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'daemon.jsonl');
    const entry = {
      ts: new Date().toISOString(),
      daemon,
      severity,
      message,
      ...details,
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error(`[daemon-bootstrap] Failed to emit event: ${e.message}`);
  }
}

function getPlatformKey() {
  const plat = process.platform;
  if (plat === 'win32') return plat;
  if (plat === 'darwin') return plat;
  if (plat === 'linux') return plat;
  throw new Error(`Unsupported platform: ${plat}`);
}

function getSessionId() {
  return process.env.CLAUDE_SESSION_ID || 'unknown';
}

function isDaemonRunning(daemonName) {
  try {
    const plat = getPlatformKey();
    if (plat === 'win32') {
      const output = execSync('tasklist /FO CSV /NH', { encoding: 'utf8' });
      const lines = output.split('\n').filter(Boolean);
      return lines.some(line => {
        const parts = line.split(',').map(p => p.trim().replace(/^"/, '').replace(/"$/, ''));
        return parts[0].includes(daemonName);
      });
    } else {
      try {
        execSync(`pgrep -f "${daemonName}" > /dev/null 2>&1`);
        return true;
      } catch {
        return false;
      }
    }
  } catch (e) {
    return false;
  }
}

function writeStatusFile(daemonName, status, sessionId) {
  try {
    fs.mkdirSync(GM_STATE_DIR, { recursive: true });
    const statusFile = path.join(GM_STATE_DIR, `${daemonName}-status.json`);
    const payload = {
      daemon: daemonName,
      status,
      sessionId,
      timestamp: new Date().toISOString(),
      pid: process.pid,
    };
    fs.writeFileSync(statusFile, JSON.stringify(payload, null, 2));
    emitDaemonEvent(daemonName, 'info', 'Status written', { file: statusFile });
  } catch (e) {
    emitDaemonEvent(daemonName, 'warn', 'Failed to write status file', { error: e.message });
  }
}

async function ensureRsLearningDaemonRunning() {
  const daemonName = 'rs-learn';
  const sessionId = getSessionId();
  const startTime = Date.now();

  try {
    emitDaemonEvent(daemonName, 'info', 'Daemon startup check initiated', { sessionId });

    if (isDaemonRunning(daemonName)) {
      emitDaemonEvent(daemonName, 'info', 'Daemon already running', { sessionId });
      writeStatusFile(daemonName, 'running', sessionId);
      return { ok: true, already_running: true };
    }

    emitDaemonEvent(daemonName, 'info', 'Spawning daemon', { sessionId });

    const env = Object.assign({}, process.env, {
      CLAUDE_SESSION_ID: sessionId,
    });

    const proc = spawn('bun', ['x', 'rs-learn@latest'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env,
    });

    const pid = proc.pid;
    proc.unref();

    emitDaemonEvent(daemonName, 'info', 'Daemon spawned successfully', { pid, sessionId });
    writeStatusFile(daemonName, 'started', sessionId);

    return {
      ok: true,
      pid,
      sessionId,
      durationMs: Date.now() - startTime,
    };
  } catch (e) {
    emitDaemonEvent(daemonName, 'error', 'Daemon spawn failed', {
      error: e.message,
      sessionId,
      durationMs: Date.now() - startTime,
    });
    writeStatusFile(daemonName, 'error', sessionId);
    throw e;
  }
}

module.exports = {
  ensureRsLearningDaemonRunning,
};
