const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');
const net = require('net');

const PLUGKIT_TOOLS_DIR = path.join(os.homedir(), '.claude', 'gm-tools');
const PLUGKIT_VERSION_FILE = path.join(PLUGKIT_TOOLS_DIR, 'plugkit.version');
const BOOTSTRAP_STATUS_FILE = path.join(os.homedir(), '.gm', 'bootstrap-status.json');
const BOOTSTRAP_ERROR_FILE = path.join(os.homedir(), '.gm', 'bootstrap-error.json');
const LOG_DIR = path.join(os.homedir(), '.claude', 'gm-log');
const PLATFORM_MAP = {
  win32: { suffix: '-win32-x64.exe', altSuffix: '-win32-arm64.exe' },
  darwin: { suffix: '-darwin-x64', altSuffix: '-darwin-arm64' },
  linux: { suffix: '-linux-x64', altSuffix: '-linux-arm64' },
};

function getPlatformKey() {
  const plat = process.platform;
  if (plat === 'win32') return plat;
  if (plat === 'darwin') return plat;
  if (plat === 'linux') return plat;
  throw new Error(`Unsupported platform: ${plat}`);
}

function getExpectedBinaryName() {
  const plat = getPlatformKey();
  const suffix = PLATFORM_MAP[plat].suffix;
  return `plugkit${suffix}`;
}

function getPlugkitPath() {
  const name = getExpectedBinaryName();
  return path.join(PLUGKIT_TOOLS_DIR, name);
}

function emitBootstrapEvent(severity, message, details) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logDir = path.join(LOG_DIR, date);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'bootstrap.jsonl');
    const entry = {
      ts: new Date().toISOString(),
      severity,
      message,
      ...details,
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error(`[bootstrap] Failed to emit event: ${e.message}`);
  }
}

function readManifest() {
  try {
    const gmJsonPath = path.join(process.cwd(), 'gm-starter', 'gm.json');
    if (!fs.existsSync(gmJsonPath)) {
      throw new Error('gm-starter/gm.json not found');
    }
    const gm = JSON.parse(fs.readFileSync(gmJsonPath, 'utf8'));
    const version = gm.plugkitVersion;

    const sha256Path = path.join(process.cwd(), 'gm-starter', 'bin', 'plugkit.sha256');
    if (!fs.existsSync(sha256Path)) {
      throw new Error('gm-starter/bin/plugkit.sha256 not found');
    }
    const sha256Lines = fs.readFileSync(sha256Path, 'utf8').split('\n').filter(Boolean);
    const binaryName = getExpectedBinaryName();
    const hashLine = sha256Lines.find(line => line.includes(binaryName));
    if (!hashLine) {
      throw new Error(`No hash found for ${binaryName}`);
    }
    const expectedHash = hashLine.split(/\s+/)[0];

    return { version, expectedHash };
  } catch (e) {
    emitBootstrapEvent('error', 'Failed to read manifest', { error: e.message });
    throw e;
  }
}

function getInstalledVersion() {
  try {
    if (fs.existsSync(PLUGKIT_VERSION_FILE)) {
      return fs.readFileSync(PLUGKIT_VERSION_FILE, 'utf8').trim();
    }
    return null;
  } catch (e) {
    return null;
  }
}

function computeFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function downloadPlugkitBinary(version) {
  const binaryName = getExpectedBinaryName();
  const url = `https://github.com/AnEntrypoint/plugkit-bin/releases/download/${version}/${binaryName}`;

  emitBootstrapEvent('info', 'Starting binary download', { version, binaryName, url });

  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 30000 }, (res) => {
        if (res.statusCode === 404) {
          reject(new Error(`Binary not found: ${binaryName} v${version}`));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} downloading ${binaryName}`));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const data = Buffer.concat(chunks);
          emitBootstrapEvent('info', 'Binary download complete', { bytes: data.length });
          resolve(data);
        });
      })
      .on('error', (e) => {
        emitBootstrapEvent('error', 'Download failed', { error: e.message });
        reject(e);
      });
  });
}

function isProcessRunning(pidOrName) {
  try {
    const plat = getPlatformKey();
    if (plat === 'win32') {
      const output = execSync('tasklist /FO CSV /NH', { encoding: 'utf8' });
      const lines = output.split('\n').filter(Boolean);
      return lines.some(line => {
        const parts = line.split(',').map(p => p.trim().replace(/^"/, '').replace(/"$/, ''));
        return parts[0] === 'plugkit.exe' || parts[0] === pidOrName;
      });
    } else {
      try {
        execSync(`ps -p ${pidOrName} > /dev/null 2>&1`);
        return true;
      } catch {
        return false;
      }
    }
  } catch (e) {
    return false;
  }
}

function killExistingPlugkit() {
  try {
    const plat = getPlatformKey();
    if (plat === 'win32') {
      execSync('taskkill /IM plugkit.exe /F 2>nul || true', { shell: true });
      emitBootstrapEvent('info', 'Killed existing plugkit process on Windows');
    } else {
      execSync('pkill -f "plugkit" || true', { shell: true });
      emitBootstrapEvent('info', 'Killed existing plugkit process on Unix');
    }
  } catch (e) {
    emitBootstrapEvent('warn', 'Failed to kill existing plugkit', { error: e.message });
  }
}

async function ensureBinaryWritable(filePath) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    throw new Error(`Cannot write to ${filePath}: ${e.message}`);
  }
}

async function writeBinaryWithRetry(filePath, data, maxRetries = 3) {
  let lastErr;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await ensureBinaryWritable(filePath);
      fs.writeFileSync(filePath, data);
      fs.chmodSync(filePath, 0o755);
      emitBootstrapEvent('info', 'Binary written successfully', { path: filePath });
      return;
    } catch (e) {
      lastErr = e;
      emitBootstrapEvent('warn', `Write attempt ${attempt + 1} failed`, { error: e.message });
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 50 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr;
}

async function verifyBinaryHealth(filePath) {
  try {
    if (process.platform === 'win32') {
      execSync(`"${filePath}" health > nul 2>&1`, { timeout: 5000, shell: true });
    } else {
      execSync(`"${filePath}" health > /dev/null 2>&1`, { timeout: 5000 });
    }
    emitBootstrapEvent('info', 'Binary health check passed');
    return true;
  } catch (e) {
    emitBootstrapEvent('warn', 'Binary health check failed', { error: e.message });
    return false;
  }
}

async function spawnPlugkitWatcher(filePath) {
  try {
    emitBootstrapEvent('info', 'Spawning plugkit watcher daemon');

    const cmd = process.platform === 'win32' ? filePath : filePath;
    const proc = spawn(cmd, ['watch', '--once=false'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    const pid = proc.pid;
    proc.unref();

    emitBootstrapEvent('info', 'Plugkit watcher spawned', { pid });
    return pid;
  } catch (e) {
    emitBootstrapEvent('error', 'Failed to spawn plugkit watcher', { error: e.message });
    throw e;
  }
}

async function bootstrapPlugkit() {
  const startTime = Date.now();

  try {
    emitBootstrapEvent('info', 'Bootstrap started');

    const { version: manifestVersion, expectedHash } = readManifest();
    const installedVersion = getInstalledVersion();
    const plugkitPath = getPlugkitPath();

    const versionMismatch = installedVersion !== manifestVersion;
    const binaryMissing = !fs.existsSync(plugkitPath);

    if (!binaryMissing && !versionMismatch) {
      emitBootstrapEvent('info', 'Binary up-to-date', { version: installedVersion });

      if (isProcessRunning('plugkit')) {
        emitBootstrapEvent('info', 'Plugkit watcher already running');
        const statusPayload = {
          ok: true,
          version: installedVersion,
          status: 'running',
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        };
        fs.mkdirSync(path.dirname(BOOTSTRAP_STATUS_FILE), { recursive: true });
        fs.writeFileSync(BOOTSTRAP_STATUS_FILE, JSON.stringify(statusPayload, null, 2));
        return { ok: true };
      }
    }

    if (binaryMissing || versionMismatch) {
      emitBootstrapEvent('info', 'Downloading binary', {
        reason: binaryMissing ? 'missing' : 'version-mismatch',
        version: manifestVersion,
      });

      let binaryData;
      try {
        binaryData = await downloadPlugkitBinary(manifestVersion);
      } catch (downloadErr) {
        emitBootstrapEvent('error', 'Download failed, checking for cached binary', {
          error: downloadErr.message,
          fallback: fs.existsSync(plugkitPath),
        });

        if (!fs.existsSync(plugkitPath)) {
          throw downloadErr;
        }
        emitBootstrapEvent('info', 'Using cached binary as fallback');
        binaryData = null;
      }

      if (binaryData) {
        const downloadedHash = crypto.createHash('sha256').update(binaryData).digest('hex');
        if (downloadedHash !== expectedHash) {
          throw new Error(`Hash mismatch: got ${downloadedHash}, expected ${expectedHash}`);
        }

        killExistingPlugkit();
        await writeBinaryWithRetry(plugkitPath, binaryData);

        fs.mkdirSync(path.dirname(PLUGKIT_VERSION_FILE), { recursive: true });
        fs.writeFileSync(PLUGKIT_VERSION_FILE, manifestVersion + '\n');
        emitBootstrapEvent('info', 'Binary installed', { version: manifestVersion });
      }
    }

    const isHealthy = await verifyBinaryHealth(plugkitPath);
    if (!isHealthy) {
      emitBootstrapEvent('warn', 'Binary health check failed, but proceeding');
    }

    const watcherRunning = isProcessRunning('plugkit');
    let watcherPid;
    if (!watcherRunning) {
      watcherPid = await spawnPlugkitWatcher(plugkitPath);
    } else {
      watcherPid = 'already-running';
      emitBootstrapEvent('info', 'Watcher already running');
    }

    const currentVersion = getInstalledVersion() || manifestVersion;
    const statusPayload = {
      ok: true,
      version: currentVersion,
      watcherPid,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };

    fs.mkdirSync(path.dirname(BOOTSTRAP_STATUS_FILE), { recursive: true });
    fs.writeFileSync(BOOTSTRAP_STATUS_FILE, JSON.stringify(statusPayload, null, 2));

    emitBootstrapEvent('info', 'Bootstrap completed successfully', statusPayload);
    return { ok: true };
  } catch (err) {
    const errorPayload = {
      ok: false,
      error: err.message,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      stack: err.stack,
    };

    fs.mkdirSync(path.dirname(BOOTSTRAP_ERROR_FILE), { recursive: true });
    fs.writeFileSync(BOOTSTRAP_ERROR_FILE, JSON.stringify(errorPayload, null, 2));

    emitBootstrapEvent('error', 'Bootstrap failed', errorPayload);
    console.error(`[skill-bootstrap] ${err.message}`);

    return { ok: false, error: err.message };
  }
}

async function checkPortReachable(host, port, timeoutMs = 500) {
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

async function bootstrapAcptoapi() {
  const port = 4800;
  const running = await checkPortReachable('127.0.0.1', port);
  if (running) return { ok: true, status: 'already-running' };

  emitBootstrapEvent('info', 'Spawning acptoapi daemon');
  try {
    const child = spawn('bun', ['x', 'acptoapi@latest'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    emitBootstrapEvent('info', 'acptoapi spawned', { pid: child.pid });
    return { ok: true, status: 'spawned', pid: child.pid };
  } catch (e) {
    emitBootstrapEvent('error', 'Failed to spawn acptoapi', { error: e.message });
    return { ok: false, error: e.message };
  }
}

async function getSnapshot(sessionId, cwd) {
  const plugkitPath = getPlugkitPath();
  if (!fs.existsSync(plugkitPath)) {
    return { git: { ok: false }, tasks: [], error: 'plugkit not found' };
  }

  try {
    const sid = sessionId || process.env.CLAUDE_SESSION_ID || 'default';
    const c = cwd || process.cwd();
    const cmd = `"${plugkitPath}" snapshot --session "${sid}" --cwd "${c}"`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(output);
  } catch (e) {
    emitBootstrapEvent('warn', 'Failed to get snapshot', { error: e.message });
    return { git: { ok: false }, tasks: [], error: e.message };
  }
}

module.exports = { 
  bootstrapPlugkit,
  bootstrapAcptoapi,
  getSnapshot,
  checkPortReachable
};
