#!/usr/bin/env node
'use strict';
// rs-plugkit: Standalone plugkit bootstrap tool.
// Usage: bun x rs-plugkit [command]
//   install  - Download and install the correct plugkit binary
//   ensure   - Ensure plugkit is ready (install if missing/outdated)
//   check    - Check if plugkit is installed and up-to-date
//   version  - Print the pinned plugkit version
//   where    - Print the plugkit binary path
//   kill     - Kill all running plugkit processes
//   daemon   - Start plugkit in watch/daemon mode
//
// Can be invoked spontaneously via `bun x rs-plugkit` from anywhere.

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const crypto = require('crypto');
const { spawn, spawnSync, execSync } = require('child_process');
const { URL } = require('url');

const RELEASE_REPO = process.env.PLUGKIT_RELEASE_REPO || 'AnEntrypoint/plugkit-bin';
const ATTEMPT_TIMEOUT_MS = 5 * 60 * 1000;
const STALL_TIMEOUT_MS = 15 * 1000;
const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [2000, 5000, 15000, 30000];
const LOCK_STALE_MS = 30 * 60 * 1000;

// --- Defaults ---
// Allow override via env or find nearest plugkit.version file
function findVersionFile() {
  const searchPaths = [
    path.join(process.cwd(), 'gm-starter', 'bin', 'plugkit.version'),
    path.join(__dirname, '..', 'gm-starter', 'bin', 'plugkit.version'),
    path.join(os.homedir(), '.claude', 'gm-tools', 'plugkit.version'),
    // Walk up from cwd looking for gm-starter/bin/plugkit.version
    (() => {
      let dir = process.cwd();
      for (let i = 0; i < 10; i++) {
        const tryPath = path.join(dir, 'gm-starter', 'bin', 'plugkit.version');
        if (fs.existsSync(tryPath)) return tryPath;
        const tryPath2 = path.join(dir, 'bin', 'plugkit.version');
        if (fs.existsSync(tryPath2)) return tryPath2;
        dir = path.dirname(dir);
      }
      return null;
    })(),
  ];
  for (const p of searchPaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function readVersionFile(wrapperDir) {
  const vFile = path.join(wrapperDir, 'plugkit.version');
  if (!fs.existsSync(vFile)) return null;
  return fs.readFileSync(vFile, 'utf8').trim();
}

function getCacheRoot() {
  if (process.env.PLUGKIT_CACHE_DIR) return process.env.PLUGKIT_CACHE_DIR;
  const home = os.homedir();
  if (os.platform() === 'win32') {
    const base = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return path.join(base, 'plugkit', 'bin');
  }
  if (os.platform() === 'darwin') return path.join(home, 'Library', 'Caches', 'plugkit', 'bin');
  const xdg = process.env.XDG_CACHE_HOME || path.join(home, '.cache');
  return path.join(xdg, 'plugkit', 'bin');
}

function getToolsDir() {
  const home = os.homedir();
  return path.join(home, '.claude', 'gm-tools');
}

function platformKey() {
  const p = os.platform();
  const a = os.arch();
  if (p === 'win32') return a === 'arm64' ? 'win32-arm64' : 'win32-x64';
  if (p === 'darwin') return a === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  return (a === 'arm64' || a === 'aarch64') ? 'linux-arm64' : 'linux-x64';
}

function binaryName() {
  const key = platformKey();
  return key.startsWith('win32') ? `plugkit-${key}.exe` : `plugkit-${key}`;
}

function sha256FileSync(filePath) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(1 << 20);
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  } finally { fs.closeSync(fd); }
  return h.digest('hex');
}

function sha256FileStream(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    const s = fs.createReadStream(filePath);
    s.on('data', c => h.update(c));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

function readShaManifest(wrapperDir) {
  const p = path.join(wrapperDir, 'plugkit.sha256');
  if (!fs.existsSync(p)) return null;
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([0-9a-f]{64})\s+(\S+)\s*$/i);
    if (m) out[m[2]] = m[1].toLowerCase();
  }
  return out;
}

function acquireLock(lockPath) {
  const start = Date.now();
  for (;;) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return true;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      let stale = false;
      try {
        const st = fs.statSync(lockPath);
        if (Date.now() - st.mtimeMs > LOCK_STALE_MS) stale = true;
        const owner = parseInt(fs.readFileSync(lockPath, 'utf8').trim(), 10);
        if (Number.isFinite(owner) && owner !== process.pid) {
          try { process.kill(owner, 0); } catch { stale = true; }
        }
      } catch { stale = true; }
      if (stale) { try { fs.unlinkSync(lockPath); } catch {} continue; }
      if (Date.now() - start > ATTEMPT_TIMEOUT_MS) throw new Error(`lock wait timeout: ${lockPath}`);
      try { spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},2000)'], { timeout: 2500, killSignal: 'SIGKILL', stdio: 'ignore' }); } catch {}
    }
  }
}

function releaseLock(lockPath) {
  try { fs.unlinkSync(lockPath); } catch {}
}

function fetchToFile(url, destPath, expectedTotal) {
  return new Promise((resolve, reject) => {
    let existing = 0;
    try { existing = fs.statSync(destPath).size; } catch {}
    const headers = { 'User-Agent': 'rs-plugkit/1.0', 'Accept': '*/*' };
    if (existing > 0) headers['Range'] = `bytes=${existing}-`;

    const u = new URL(url);
    const req = https.request({
      method: 'GET',
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers,
      timeout: ATTEMPT_TIMEOUT_MS,
    }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        res.resume();
        return resolve(fetchToFile(res.headers.location, destPath, expectedTotal));
      }
      if (res.statusCode === 416) { res.resume(); try { fs.unlinkSync(destPath); } catch {} return reject(new Error('range-not-satisfiable')); }
      if (![200, 206].includes(res.statusCode)) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const append = res.statusCode === 206 && existing > 0;
      try { fs.mkdirSync(path.dirname(destPath), { recursive: true }); } catch {}
      const out = fs.createWriteStream(destPath, { flags: append ? 'a' : 'w' });
      let bytes = append ? existing : 0;
      let lastStderr = Date.now();
      let lastByte = Date.now();
      const stallTimer = setInterval(() => {
        if (Date.now() - lastByte > STALL_TIMEOUT_MS) {
          clearInterval(stallTimer);
          req.destroy(new Error(`stalled: no bytes for ${STALL_TIMEOUT_MS}ms`));
        }
      }, 2000);
      res.on('data', c => {
        bytes += c.length;
        lastByte = Date.now();
        if (Date.now() - lastStderr > 5000) {
          const pct = expectedTotal ? ` ${Math.floor(bytes / expectedTotal * 100)}%` : '';
          process.stderr.write(`[rs-plugkit] ${(bytes / 1048576).toFixed(1)} MiB${pct}\n`);
          lastStderr = Date.now();
        }
      });
      out.on('finish', () => { clearInterval(stallTimer); resolve(bytes); });
      out.on('error', err => { clearInterval(stallTimer); reject(err); });
      res.on('error', err => { clearInterval(stallTimer); reject(err); });
      out.on('close', () => clearInterval(stallTimer));
    });
    req.on('timeout', () => req.destroy(new Error(`timeout after ${ATTEMPT_TIMEOUT_MS}ms`)));
    req.on('error', reject);
    req.end();
  });
}

async function downloadWithRetry(url, destPath) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      process.stderr.write(`[rs-plugkit] fetch attempt ${attempt}/${MAX_ATTEMPTS}\n`);
      await fetchToFile(url, destPath);
      return;
    } catch (err) {
      lastErr = err;
      process.stderr.write(`[rs-plugkit] attempt ${attempt} failed: ${err.message}\n`);
      if (attempt < MAX_ATTEMPTS) {
        const wait = BACKOFF_MS[attempt - 1] || 120000;
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

function healIfShaMatches(binPath, expectedSha, sentinelPath, partialPath) {
  if (!fs.existsSync(binPath)) return false;
  if (partialPath) { try { if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath); } catch {} }
  if (!expectedSha) return false;
  let got;
  try { got = sha256FileSync(binPath); } catch { return false; }
  if (got !== expectedSha) { try { fs.unlinkSync(binPath); } catch {} return false; }
  try { fs.writeFileSync(sentinelPath, new Date().toISOString()); } catch { return false; }
  return true;
}

function isDaemonRunning() {
  const bin = toolsBin();
  if (!fs.existsSync(bin)) return false;
  try {
    const r = spawnSync(bin, ['--version'], { timeout: 3000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return !r.error;
  } catch { return false; }
}

function toolsBin() {
  const home = os.homedir();
  const exe = process.platform === 'win32' ? 'plugkit.exe' : 'plugkit';
  return path.join(home, '.claude', 'gm-tools', exe);
}

function copyToGmTools(finalPath, version) {
  const dst = getToolsDir();
  fs.mkdirSync(dst, { recursive: true });
  const exeName = process.platform === 'win32' ? 'plugkit.exe' : 'plugkit';
  const target = path.join(dst, exeName);
  const targetTmp = target + '.new';
  // Kill holders on Windows
  if (fs.existsSync(target)) {
    try {
      if (process.platform === 'win32') {
        try { execSync(`taskkill /F /IM plugkit.exe /T`, { stdio: 'ignore' }); } catch {}
      } else {
        try { execSync(`pkill -f plugkit || true`, { stdio: 'ignore' }); } catch {}
      }
    } catch {}
    try { fs.unlinkSync(target); } catch {}
  }
  fs.copyFileSync(finalPath, targetTmp);
  try { fs.renameSync(targetTmp, target); } catch {
    try { fs.unlinkSync(target); fs.renameSync(targetTmp, target); } catch (e) { throw e; }
  }
  if (process.platform !== 'win32') { try { fs.chmodSync(target, 0o755); } catch {} }
  try { fs.writeFileSync(path.join(dst, 'plugkit.version'), version); } catch {}
  try {
    const srcSha = path.join(path.dirname(finalPath), '..', 'plugkit.sha256');
    if (fs.existsSync(srcSha)) fs.copyFileSync(srcSha, path.join(dst, 'plugkit.sha256'));
  } catch {}
}

async function ensureReady(silent) {
  const wrapperDir = path.join(__dirname, '..', 'gm-starter', 'bin');
  const verFile = path.join(wrapperDir, 'plugkit.version');
  if (!fs.existsSync(verFile)) {
    // Try finding version file elsewhere
    const found = findVersionFile();
    if (found) {
      const altDir = path.dirname(found);
      return doEnsure(altDir, silent);
    }
    process.stderr.write('[rs-plugkit] plugkit.version not found\n');
    return false;
  }
  return doEnsure(wrapperDir, silent);
}

async function doEnsure(wrapperDir, silent) {
  const version = readVersionFile(wrapperDir);
  if (!version) { process.stderr.write('[rs-plugkit] no version found\n'); return false; }

  const shaManifest = readShaManifest(wrapperDir);
  const binName = binaryName();
  const expectedSha = shaManifest ? shaManifest[binName] : null;

  const root = getCacheRoot();
  try { fs.mkdirSync(root, { recursive: true }); } catch { const fb = path.join(os.tmpdir(), 'plugkit-cache', 'bin'); fs.mkdirSync(fb, { recursive: true }); }

  const verDir = path.join(root, `v${version}`);
  try { fs.mkdirSync(verDir, { recursive: true }); } catch {}

  const finalPath = path.join(verDir, binName);
  const okSentinel = path.join(verDir, '.ok');
  const partialPath = `${finalPath}.partial`;

  // Check cache
  if (fs.existsSync(finalPath) && fs.existsSync(okSentinel)) {
    if (expectedSha) {
      const actualSha = sha256FileSync(finalPath);
      if (actualSha === expectedSha) {
        copyToGmTools(finalPath, version);
        return true;
      }
    } else {
      copyToGmTools(finalPath, version);
      return true;
    }
  }

  // Heal from partial
  if (healIfShaMatches(finalPath, expectedSha, okSentinel, partialPath)) {
    copyToGmTools(finalPath, version);
    return true;
  }

  // Acquire lock and download
  const lockPath = path.join(verDir, '.lock');
  acquireLock(lockPath);
  try {
    // Double-check under lock
    if (fs.existsSync(finalPath) && fs.existsSync(okSentinel)) {
      copyToGmTools(finalPath, version);
      return true;
    }
    if (healIfShaMatches(finalPath, expectedSha, okSentinel, partialPath)) {
      copyToGmTools(finalPath, version);
      return true;
    }

    // Download
    if (fs.existsSync(partialPath)) {
      try {
        const st = fs.statSync(partialPath);
        if (Date.now() - st.mtimeMs > LOCK_STALE_MS) fs.unlinkSync(partialPath);
      } catch {}
    }

    const url = `https://github.com/${RELEASE_REPO}/releases/download/v${version}/${binName}`;
    process.stderr.write(`[rs-plugkit] downloading ${url}\n`);
    await downloadWithRetry(url, partialPath);

    // Verify SHA
    if (expectedSha) {
      const got = await sha256FileStream(partialPath);
      if (got !== expectedSha) {
        try { fs.unlinkSync(partialPath); } catch {}
        process.stderr.write(`[rs-plugkit] SHA mismatch: expected ${expectedSha}, got ${got}\n`);
        return false;
      }
    }

    // Install
    try { fs.renameSync(partialPath, finalPath); } catch {
      try { fs.unlinkSync(finalPath); } catch {}
      fs.renameSync(partialPath, finalPath);
    }
    if (process.platform !== 'win32') { try { fs.chmodSync(finalPath, 0o755); } catch {} }
    fs.writeFileSync(okSentinel, new Date().toISOString());
    copyToGmTools(finalPath, version);
    process.stderr.write(`[rs-plugkit] installed v${version} to ${toolsBin()}\n`);
    return true;
  } finally {
    releaseLock(lockPath);
  }
}

function checkStatus() {
  const bin = toolsBin();
  if (!fs.existsSync(bin)) {
    process.stdout.write('not_installed\n');
    return { installed: false };
  }
  const ver = getToolsDir();
  const verFile = path.join(ver, 'plugkit.version');
  const version = fs.existsSync(verFile) ? fs.readFileSync(verFile, 'utf8').trim() : 'unknown';
  process.stdout.write(`installed ${version} ${bin}\n`);
  return { installed: true, version, path: bin };
}

function killPlugkit() {
  const bin = toolsBin();
  if (process.platform === 'win32') {
    try { execSync('taskkill /F /IM plugkit.exe /T', { stdio: 'ignore' }); } catch {}
  } else {
    try { execSync('pkill -9 -f plugkit || true', { stdio: 'ignore' }); } catch {}
  }
  process.stdout.write('killed\n');
}

async function startDaemon(watchDir) {
  const bin = toolsBin();
  if (!fs.existsSync(bin)) {
    const ok = await ensureReady(false);
    if (!ok) { process.stderr.write('[rs-plugkit] bootstrap failed\n'); process.exit(1); }
  }

  // Verify binary works
  try {
    const r = spawnSync(bin, ['--version'], { timeout: 5000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (r.error) throw r.error;
    process.stdout.write(`[rs-plugkit] plugkit ${r.stdout.trim()} ready\n`);
  } catch (e) {
    process.stderr.write(`[rs-plugkit] health check failed: ${e.message}\n`);
    process.exit(1);
  }

  watchDir = watchDir || process.cwd();
  const dotGm = path.join(watchDir, '.gm');
  const spoolIn = path.join(dotGm, 'exec-spool', 'in');
  const spoolOut = path.join(dotGm, 'exec-spool', 'out');

  process.stdout.write(`[rs-plugkit] watching ${spoolIn}\n`);

  // Start plugkit runner in watch mode if available, otherwise poll
  const runner = spawn(bin, ['runner', '--watch', spoolIn, '--out', spoolOut], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: watchDir,
  });
  runner.unref();
  process.stdout.write(`[rs-plugkit] daemon started pid=${runner.pid}\n`);

  // Keep parent alive
  setInterval(() => {}, 60000);
}

// --- CLI ---
const cmd = process.argv[2] || 'ensure';

(async () => {
  switch (cmd) {
    case 'install':
    case 'ensure': {
      const ok = await ensureReady(false);
      if (!ok) { process.stderr.write('[rs-plugkit] FAILED\n'); process.exit(1); }
      process.stdout.write('[rs-plugkit] ready: ' + toolsBin() + '\n');
      break;
    }
    case 'check': {
      const s = checkStatus();
      if (!s.installed) process.exit(1);
      break;
    }
    case 'version': {
      const wf = findVersionFile();
      if (wf) process.stdout.write(readVersionFile(path.dirname(wf)) + '\n');
      else process.stderr.write('no version file found\n');
      break;
    }
    case 'where': {
      process.stdout.write(toolsBin() + '\n');
      break;
    }
    case 'kill': {
      killPlugkit();
      break;
    }
    case 'daemon': {
      await startDaemon(process.argv[3]);
      break;
    }
    default: {
      process.stderr.write(`Usage: rs-plugkit [install|ensure|check|version|where|kill|daemon]\n`);
      process.exit(1);
    }
  }
})().catch(e => { process.stderr.write('[rs-plugkit] ' + e.message + '\n'); process.exit(1); });