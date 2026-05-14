const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.claude', 'gm-log');
const GM_STATE_DIR = path.join(os.homedir(), '.gm');

function emitEvent(daemon, severity, message, details = {}) {
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
    console.error(`[daemon-bootstrap] emit failed: ${e.message}`);
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

function checkPortReachable(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeoutHandle = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);

    socket.connect(port, host, () => {
      clearTimeout(timeoutHandle);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeoutHandle);
      resolve(false);
    });
  });
}

function writeStatusFile(daemonName, status, details = {}) {
  try {
    fs.mkdirSync(GM_STATE_DIR, { recursive: true });
    const statusFile = path.join(GM_STATE_DIR, `${daemonName}-status.json`);
    const payload = {
      daemon: daemonName,
      status,
      sessionId: getSessionId(),
      timestamp: new Date().toISOString(),
      pid: process.pid,
      ...details,
    };
    fs.writeFileSync(statusFile, JSON.stringify(payload, null, 2));
    emitEvent(daemonName, 'info', 'Status written', { file: statusFile });
  } catch (e) {
    emitEvent(daemonName, 'warn', 'Failed to write status file', { error: e.message });
  }
}

async function checkState(daemonName) {
  const sessionId = getSessionId();
  const startTime = Date.now();

  try {
    emitEvent(daemonName, 'info', 'checkState initiated', { sessionId });

    const running = isDaemonRunning(daemonName);
    if (!running) {
      emitEvent(daemonName, 'info', 'Daemon not running', { sessionId });
      writeStatusFile(daemonName, 'not_running', { sessionId });
      return { ok: true, running: false, durationMs: Date.now() - startTime };
    }

    emitEvent(daemonName, 'info', 'Daemon running', { sessionId });
    writeStatusFile(daemonName, 'running', { sessionId });
    return { ok: true, running: true, durationMs: Date.now() - startTime };
  } catch (e) {
    emitEvent(daemonName, 'error', 'checkState failed', {
      error: e.message,
      sessionId,
      durationMs: Date.now() - startTime,
    });
    return { ok: false, error: e.message, durationMs: Date.now() - startTime };
  }
}

async function spawn(daemonName, cmd) {
  const sessionId = getSessionId();
  const startTime = Date.now();

  try {
    emitEvent(daemonName, 'info', 'spawn initiated', { cmd, sessionId });

    if (isDaemonRunning(daemonName)) {
      emitEvent(daemonName, 'info', 'Already running, skipping spawn', { sessionId });
      writeStatusFile(daemonName, 'running', { sessionId });
      return { ok: true, already_running: true, durationMs: Date.now() - startTime };
    }

    emitEvent(daemonName, 'info', 'Spawning daemon', { cmd, sessionId });

    const env = Object.assign({}, process.env, {
      CLAUDE_SESSION_ID: sessionId,
    });

    const proc = spawn('bun', ['x', cmd], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env,
    });

    const pid = proc.pid;
    proc.unref();

    emitEvent(daemonName, 'info', 'Daemon spawned', { pid, cmd, sessionId });
    writeStatusFile(daemonName, 'spawned', { pid, sessionId });

    return {
      ok: true,
      pid,
      cmd,
      sessionId,
      durationMs: Date.now() - startTime,
    };
  } catch (e) {
    emitEvent(daemonName, 'error', 'spawn failed', {
      error: e.message,
      cmd,
      sessionId,
      durationMs: Date.now() - startTime,
    });
    writeStatusFile(daemonName, 'spawn_error', { error: e.message, sessionId });
    return { ok: false, error: e.message, durationMs: Date.now() - startTime };
  }
}

async function waitForReady(daemonName, host, port, timeoutMs = 30000) {
  const sessionId = getSessionId();
  const startTime = Date.now();

  try {
    emitEvent(daemonName, 'info', 'waitForReady initiated', {
      host,
      port,
      timeoutMs,
      sessionId,
    });

    const deadline = startTime + timeoutMs;
    const pollIntervalMs = 500;

    while (Date.now() < deadline) {
      const reachable = await checkPortReachable(host, port, 1000);
      if (reachable) {
        emitEvent(daemonName, 'info', 'Ready', {
          host,
          port,
          elapsedMs: Date.now() - startTime,
          sessionId,
        });
        writeStatusFile(daemonName, 'ready', { host, port, sessionId });
        return { ok: true, host, port, elapsedMs: Date.now() - startTime };
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    emitEvent(daemonName, 'warn', 'Timeout waiting for readiness', {
      host,
      port,
      timeoutMs,
      sessionId,
      elapsedMs: Date.now() - startTime,
    });
    writeStatusFile(daemonName, 'timeout', { host, port, timeoutMs, sessionId });
    return { ok: false, error: 'Timeout', timeoutMs, elapsedMs: Date.now() - startTime };
  } catch (e) {
    emitEvent(daemonName, 'error', 'waitForReady failed', {
      error: e.message,
      host,
      port,
      sessionId,
      elapsedMs: Date.now() - startTime,
    });
    return { ok: false, error: e.message, elapsedMs: Date.now() - startTime };
  }
}

async function getSocket(daemonName) {
  try {
    emitEvent(daemonName, 'info', 'getSocket initiated', { sessionId: getSessionId() });

    const statusFile = path.join(GM_STATE_DIR, `${daemonName}-status.json`);
    if (!fs.existsSync(statusFile)) {
      emitEvent(daemonName, 'warn', 'No status file found', { statusFile });
      return { ok: false, error: 'No status file found' };
    }

    const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    const socket = `${status.host || '127.0.0.1'}:${status.port || 'unknown'}`;

    emitEvent(daemonName, 'info', 'Socket retrieved', { socket });
    return { ok: true, socket, ...status };
  } catch (e) {
    emitEvent(daemonName, 'error', 'getSocket failed', {
      error: e.message,
      sessionId: getSessionId(),
    });
    return { ok: false, error: e.message };
  }
}

async function shutdown(daemonName) {
  const sessionId = getSessionId();
  const startTime = Date.now();

  try {
    emitEvent(daemonName, 'info', 'shutdown initiated', { sessionId });

    const plat = getPlatformKey();
    let killed = false;

    if (plat === 'win32') {
      try {
        execSync(`taskkill /F /IM ${daemonName}* /T`, { stdio: 'ignore' });
        killed = true;
      } catch {
        killed = false;
      }
    } else {
      try {
        execSync(`pkill -9 -f "${daemonName}"`, { stdio: 'ignore' });
        killed = true;
      } catch {
        killed = false;
      }
    }

    emitEvent(daemonName, 'info', 'shutdown completed', {
      killed,
      sessionId,
      durationMs: Date.now() - startTime,
    });
    writeStatusFile(daemonName, 'shutdown', { killed, sessionId });

    return { ok: true, killed, durationMs: Date.now() - startTime };
  } catch (e) {
    emitEvent(daemonName, 'error', 'shutdown failed', {
      error: e.message,
      sessionId,
      durationMs: Date.now() - startTime,
    });
    return { ok: false, error: e.message, durationMs: Date.now() - startTime };
  }
}

module.exports = {
  checkState,
  spawn,
  waitForReady,
  getSocket,
  shutdown,
  emitEvent,
  isDaemonRunning,
  checkPortReachable,
};
