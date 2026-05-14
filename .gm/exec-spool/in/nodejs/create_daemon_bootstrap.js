const fs = require('fs');
const path = require('path');

const daemonContent = `const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');

const LOG_DIR = path.join(os.homedir(), '.claude', 'gm-log');

function emitDaemonEvent(daemon, severity, message, details) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logDir = path.join(LOG_DIR, date);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, \`\${daemon}.jsonl\`);
    const entry = {
      ts: new Date().toISOString(),
      severity,
      message,
      ...details,
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\\n');
  } catch (e) {
    console.error(\`[\${daemon}] Failed to emit event: \${e.message}\`);
  }
}

function computeDigest(cwd) {
  try {
    const files = [];
    const walkDir = (dir, depth = 0) => {
      if (depth > 3) return;
      try {
        const entries = fs.readdirSync(dir);
        entries.forEach(entry => {
          if (entry.startsWith('.') && entry !== '.git') return;
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);
          if (!stat.isDirectory() || entry === '.git') {
            files.push({ path: fullPath, mtime: stat.mtimeMs });
          } else {
            walkDir(fullPath, depth + 1);
          }
        });
      } catch (e) {}
    };

    walkDir(cwd);
    const mtimeSum = files.reduce((sum, f) => sum + f.mtime, 0);

    let gitHead = 'unknown';
    try {
      gitHead = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8' }).trim();
    } catch (e) {
      gitHead = 'no-repo';
    }

    let isDirty = false;
    try {
      const status = execSync('git status --porcelain', { cwd, encoding: 'utf8' });
      isDirty = status.trim().length > 0;
    } catch (e) {}

    const digestStr = \`\${mtimeSum}:\${gitHead}:\${isDirty ? 'dirty' : 'clean'}\`;
    return crypto.createHash('sha256').update(digestStr).digest('hex');
  } catch (e) {
    emitDaemonEvent('daemon-bootstrap', 'warn', 'Failed to compute digest', { error: e.message });
    return 'error-digest';
  }
}

function isProcessRunning(processName) {
  try {
    if (process.platform === 'win32') {
      const output = execSync('tasklist /FO CSV /NH', { encoding: 'utf8' });
      const lines = output.split('\\n').filter(Boolean);
      return lines.some(line => {
        const parts = line.split(',').map(p => p.trim().replace(/^"/, '').replace(/"$/, ''));
        return parts[0] === processName || parts[0] === \`\${processName}.exe\`;
      });
    } else {
      try {
        execSync(\`pgrep -f "\${processName}" > /dev/null 2>&1\`);
        return true;
      } catch {
        return false;
      }
    }
  } catch (e) {
    return false;
  }
}

function getStatusPath(daemon, sessionId) {
  const baseDir = path.join(process.cwd(), '.gm');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  const suffix = sessionId ? \`-\${sessionId}\` : '';
  return path.join(baseDir, \`\${daemon}-status\${suffix}.json\`);
}

async function ensureRsCodeinsightDaemonRunning(cwd = process.cwd(), sessionId = null) {
  const startTime = Date.now();
  const daemon = 'rs-codeinsight';

  try {
    emitDaemonEvent(daemon, 'info', 'Bootstrap started', { sessionId });

    const statusPath = getStatusPath(daemon, sessionId);
    const digestPath = path.join(cwd, '.codeinsight.digest');
    const currentDigest = computeDigest(cwd);
    const storedDigest = fs.existsSync(digestPath)
      ? fs.readFileSync(digestPath, 'utf8').trim()
      : null;

    const digestMismatch = storedDigest !== currentDigest;

    if (isProcessRunning('rs-codeinsight') && !digestMismatch) {
      emitDaemonEvent(daemon, 'info', 'Daemon already running with fresh index', {
        sessionId,
        digest: currentDigest
      });
      const status = {
        ok: true,
        status: 'running',
        fresh: true,
        digest: currentDigest,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
      if (sessionId) status.sessionId = sessionId;
      fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
      return { ok: true, fresh: true };
    }

    if (digestMismatch) {
      emitDaemonEvent(daemon, 'info', 'Index stale, refreshing', {
        sessionId,
        oldDigest: storedDigest,
        newDigest: currentDigest
      });
      fs.writeFileSync(digestPath, currentDigest);
    }

    if (!isProcessRunning('rs-codeinsight')) {
      emitDaemonEvent(daemon, 'info', 'Spawning daemon', { sessionId });
      const proc = spawn('rs-codeinsight', [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: process.platform === 'win32',
      });
      proc.unref();
      emitDaemonEvent(daemon, 'info', 'Daemon spawned', { sessionId, pid: proc.pid });
    }

    const status = {
      ok: true,
      status: 'running',
      fresh: !digestMismatch,
      digest: currentDigest,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
    if (sessionId) status.sessionId = sessionId;

    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    emitDaemonEvent(daemon, 'info', 'Bootstrap completed', status);
    return { ok: true };
  } catch (err) {
    const errorPayload = {
      ok: false,
      error: err.message,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
    if (sessionId) errorPayload.sessionId = sessionId;

    const statusPath = getStatusPath(daemon, sessionId);
    fs.writeFileSync(statusPath, JSON.stringify(errorPayload, null, 2));
    emitDaemonEvent(daemon, 'error', 'Bootstrap failed', errorPayload);
    return { ok: false, error: err.message };
  }
}

async function ensureRsSearchDaemonRunning(cwd = process.cwd(), sessionId = null) {
  const startTime = Date.now();
  const daemon = 'rs-search';

  try {
    emitDaemonEvent(daemon, 'info', 'Bootstrap started', { sessionId });

    const statusPath = getStatusPath(daemon, sessionId);
    const digestPath = path.join(cwd, '.search.digest');
    const currentDigest = computeDigest(cwd);
    const storedDigest = fs.existsSync(digestPath)
      ? fs.readFileSync(digestPath, 'utf8').trim()
      : null;

    const digestMismatch = storedDigest !== currentDigest;

    if (isProcessRunning('rs-search') && !digestMismatch) {
      emitDaemonEvent(daemon, 'info', 'Daemon already running with fresh index', {
        sessionId,
        digest: currentDigest
      });
      const status = {
        ok: true,
        status: 'running',
        fresh: true,
        digest: currentDigest,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
      if (sessionId) status.sessionId = sessionId;
      fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
      return { ok: true, fresh: true };
    }

    if (digestMismatch) {
      emitDaemonEvent(daemon, 'info', 'Index stale, refreshing', {
        sessionId,
        oldDigest: storedDigest,
        newDigest: currentDigest
      });
      fs.writeFileSync(digestPath, currentDigest);
    }

    if (!isProcessRunning('rs-search')) {
      emitDaemonEvent(daemon, 'info', 'Spawning daemon', { sessionId });
      const proc = spawn('rs-search', [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: process.platform === 'win32',
      });
      proc.unref();
      emitDaemonEvent(daemon, 'info', 'Daemon spawned', { sessionId, pid: proc.pid });
    }

    const status = {
      ok: true,
      status: 'running',
      fresh: !digestMismatch,
      digest: currentDigest,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
    if (sessionId) status.sessionId = sessionId;

    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    emitDaemonEvent(daemon, 'info', 'Bootstrap completed', status);
    return { ok: true };
  } catch (err) {
    const errorPayload = {
      ok: false,
      error: err.message,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
    if (sessionId) errorPayload.sessionId = sessionId;

    const statusPath = getStatusPath(daemon, sessionId);
    fs.writeFileSync(statusPath, JSON.stringify(errorPayload, null, 2));
    emitDaemonEvent(daemon, 'error', 'Bootstrap failed', errorPayload);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ensureRsCodeinsightDaemonRunning,
  ensureRsSearchDaemonRunning,
};
`;

const libPath = path.join(process.cwd(), 'gm-starter', 'lib');
const daemonPath = path.join(libPath, 'daemon-bootstrap.js');

try {
  fs.writeFileSync(daemonPath, daemonContent);
  console.log('daemon-bootstrap.js created successfully');
  console.log('Path:', daemonPath);
  console.log('Size:', daemonContent.length, 'bytes');
} catch (e) {
  console.error('Failed to create daemon-bootstrap.js:', e.message);
  process.exit(1);
}
