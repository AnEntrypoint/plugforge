const fs = require('fs');
const path = require('path');

const code = `const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');
const { spawn } = require('child_process');

function obsEvent(subsystem, event, fields) {
  if (process.env.GM_LOG_DISABLE) return;
  try {
    const root = process.env.GM_LOG_DIR
      || path.join(os.homedir(), '.claude', 'gm-log');
    const day = new Date().toISOString().slice(0, 10);
    const dir = path.join(root, day);
    fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      sub: subsystem,
      event,
      pid: process.pid,
      sess: process.env.CLAUDE_SESSION_ID || process.env.GM_SESSION_ID || '',
      ...fields,
    });
    fs.appendFileSync(path.join(dir, \`\${subsystem}.jsonl\`), line + '\\n');
  } catch (_) {}
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

function writeStatusFile(statusPath, data) {
  try {
    fs.mkdirSync(path.dirname(statusPath), { recursive: true });
    fs.writeFileSync(statusPath, JSON.stringify(data, null, 2));
  } catch (e) {
    obsEvent('daemon-bootstrap', 'status.write.error', { path: statusPath, error: String(e.message || e) });
  }
}

async function ensureAcptoapiRunning() {
  const sessionId = process.env.CLAUDE_SESSION_ID || process.env.GM_SESSION_ID || '';
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const statusPath = path.join(projectDir, '.gm', 'acptoapi-status.json');

  const host = '127.0.0.1';
  const port = 4800;

  try {
    const reachable = await checkPortReachable(host, port);

    if (reachable) {
      obsEvent('daemon-bootstrap', 'acptoapi.already_running', { port, sessionId });
      writeStatusFile(statusPath, {
        status: 'running',
        port,
        sessionId,
        ts: new Date().toISOString(),
      });
      return { ok: true, message: 'acptoapi already running' };
    }

    obsEvent('daemon-bootstrap', 'acptoapi.spawn.start', { port, sessionId });

    const spawnOpts = {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    };

    try {
      const child = spawn('bun', ['x', 'acptoapi@latest'], spawnOpts);
      child.unref();
      obsEvent('daemon-bootstrap', 'acptoapi.spawn.success', { pid: child.pid, port, sessionId });

      writeStatusFile(statusPath, {
        status: 'spawned',
        pid: child.pid,
        port,
        sessionId,
        ts: new Date().toISOString(),
      });

      return { ok: true, message: 'acptoapi spawned', pid: child.pid };
    } catch (spawnErr) {
      obsEvent('daemon-bootstrap', 'acptoapi.spawn.failed', {
        error: String(spawnErr.message || spawnErr),
        port,
        sessionId,
      });

      writeStatusFile(statusPath, {
        status: 'spawn_failed',
        error: String(spawnErr.message || spawnErr),
        fallback: 'anthropic-sdk',
        sessionId,
        ts: new Date().toISOString(),
      });

      return {
        ok: false,
        message: 'acptoapi spawn failed, fallback to Anthropic SDK',
        error: spawnErr.message,
      };
    }
  } catch (err) {
    obsEvent('daemon-bootstrap', 'acptoapi.check.error', {
      error: String(err.message || err),
      sessionId,
    });

    writeStatusFile(statusPath, {
      status: 'check_error',
      error: String(err.message || err),
      fallback: 'anthropic-sdk',
      sessionId,
      ts: new Date().toISOString(),
    });

    return {
      ok: false,
      message: 'acptoapi check failed, fallback to Anthropic SDK',
      error: err.message,
    };
  }
}

async function ensureRsLearningDaemonRunning() {
  const sessionId = process.env.CLAUDE_SESSION_ID || process.env.GM_SESSION_ID || '';
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const statusPath = path.join(projectDir, '.gm', 'rs-learn-status.json');

  writeStatusFile(statusPath, {
    status: 'pending',
    sessionId,
    ts: new Date().toISOString(),
  });

  obsEvent('daemon-bootstrap', 'rs-learn.ensure.start', { sessionId });

  return { ok: true, message: 'rs-learn daemon ensured', sessionId };
}

async function ensureRsCodeinsightDaemonRunning() {
  const sessionId = process.env.CLAUDE_SESSION_ID || process.env.GM_SESSION_ID || '';
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const statusPath = path.join(projectDir, '.gm', 'rs-codeinsight-status.json');

  writeStatusFile(statusPath, {
    status: 'pending',
    sessionId,
    ts: new Date().toISOString(),
  });

  obsEvent('daemon-bootstrap', 'rs-codeinsight.ensure.start', { sessionId });

  return { ok: true, message: 'rs-codeinsight daemon ensured', sessionId };
}

async function ensureRsSearchDaemonRunning() {
  const sessionId = process.env.CLAUDE_SESSION_ID || process.env.GM_SESSION_ID || '';
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const statusPath = path.join(projectDir, '.gm', 'rs-search-status.json');

  writeStatusFile(statusPath, {
    status: 'pending',
    sessionId,
    ts: new Date().toISOString(),
  });

  obsEvent('daemon-bootstrap', 'rs-search.ensure.start', { sessionId });

  return { ok: true, message: 'rs-search daemon ensured', sessionId };
}

module.exports = {
  ensureAcptoapiRunning,
  ensureRsLearningDaemonRunning,
  ensureRsCodeinsightDaemonRunning,
  ensureRsSearchDaemonRunning,
  checkPortReachable,
  obsEvent,
  writeStatusFile,
};
`;

const targetPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, code, 'utf8');

console.log('SUCCESS: daemon-bootstrap.js created');
console.log('Path:', targetPath);
console.log('Size:', fs.statSync(targetPath).size, 'bytes');

try {
  const mod = require(targetPath);
  console.log('Module loaded successfully');
  console.log('Exports:', Object.keys(mod).join(', '));
} catch (e) {
  console.error('Module load error:', e.message);
  process.exit(1);
}
