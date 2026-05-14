const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
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

function computeIndexDigest(cwd = process.cwd()) {
  try {
    let mtimeSum = 0;
    const walkDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              walkDir(path.join(dir, entry.name));
            }
          } else {
            const fullPath = path.join(dir, entry.name);
            const stat = fs.statSync(fullPath);
            mtimeSum += stat.mtimeMs;
          }
        }
      } catch (e) {
        return;
      }
    };

    walkDir(cwd);

    let gitHead = '';
    try {
      gitHead = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
    } catch {
      gitHead = 'unknown';
    }

    let dirtyStatus = 'clean';
    try {
      const porcelain = execSync('git status --porcelain', { cwd, encoding: 'utf8' }).trim();
      if (porcelain.length > 0) {
        dirtyStatus = 'dirty';
      }
    } catch {
      dirtyStatus = 'unknown';
    }

    const digestInput = `${mtimeSum}:${gitHead}:${dirtyStatus}`;
    const digest = crypto.createHash('sha256').update(digestInput).digest('hex');
    return `v1:${digest}:files=${mtimeSum}`;
  } catch (e) {
    emitDaemonEvent('digest', 'error', 'Failed to compute digest', { error: e.message });
    return '';
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

async function ensureAcptoapiRunning() {
  const sessionId = getSessionId();
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const statusPath = path.join(projectDir, '.gm', 'acptoapi-status.json');

  const host = '127.0.0.1';
  const port = 4800;

  try {
    const reachable = await checkPortReachable(host, port);

    if (reachable) {
      emitDaemonEvent('acptoapi', 'info', 'Already running', { port, sessionId });
      writeStatusFile('acptoapi', 'running', sessionId);
      return { ok: true, message: 'acptoapi already running' };
    }

    emitDaemonEvent('acptoapi', 'info', 'Spawning daemon', { port, sessionId });

    const env = Object.assign({}, process.env, {
      CLAUDE_SESSION_ID: sessionId,
    });

    try {
      const child = spawn('bun', ['x', 'acptoapi@latest'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env,
      });
      child.unref();
      emitDaemonEvent('acptoapi', 'info', 'Daemon spawned', { pid: child.pid, port, sessionId });
      writeStatusFile('acptoapi', 'spawned', sessionId);
      return { ok: true, message: 'acptoapi spawned', pid: child.pid };
    } catch (spawnErr) {
      emitDaemonEvent('acptoapi', 'warn', 'Spawn failed, fallback to SDK', {
        error: spawnErr.message,
        sessionId,
      });
      writeStatusFile('acptoapi', 'spawn_failed', sessionId);
      return { ok: false, message: 'acptoapi spawn failed, fallback to Anthropic SDK', error: spawnErr.message };
    }
  } catch (err) {
    emitDaemonEvent('acptoapi', 'error', 'Check failed', {
      error: err.message,
      sessionId,
    });
    writeStatusFile('acptoapi', 'check_error', sessionId);
    return { ok: false, message: 'acptoapi check failed, fallback to Anthropic SDK', error: err.message };
  }
}

async function ensureRsCodeinsightDaemonRunning() {
  const daemonName = 'rs-codeinsight';
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

    const proc = spawn('bun', ['x', 'rs-codeinsight@latest'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env,
    });

    const pid = proc.pid;
    proc.unref();

    emitDaemonEvent(daemonName, 'info', 'Daemon spawned successfully', { pid, sessionId });
    writeStatusFile(daemonName, 'started', sessionId);

    return { ok: true, pid, sessionId, durationMs: Date.now() - startTime };
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

async function ensureRsSearchDaemonRunning() {
  const daemonName = 'rs-search';
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

    const proc = spawn('bun', ['x', 'rs-search@latest'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env,
    });

    const pid = proc.pid;
    proc.unref();

    emitDaemonEvent(daemonName, 'info', 'Daemon spawned successfully', { pid, sessionId });
    writeStatusFile(daemonName, 'started', sessionId);

    return { ok: true, pid, sessionId, durationMs: Date.now() - startTime };
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
  ensureAcptoapiRunning,
  ensureRsCodeinsightDaemonRunning,
  ensureRsSearchDaemonRunning,
  ensureRsLearningDaemonRunning,
  checkPortReachable,
};
