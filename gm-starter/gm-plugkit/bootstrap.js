#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const NPM_PACKAGE = '@anentrypoint/plugkit-wasm';
const ATTEMPT_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [5000, 15000];
const LOCK_STALE_MS = 30 * 60 * 1000;

const wrapperDir = __dirname;

function log(msg) {
  try { process.stderr.write(`[gm-plugkit] ${msg}\n`); } catch (_) {}
}

function obsEvent(subsystem, event, fields) {
  if (process.env.GM_LOG_DISABLE) return;
  try {
    const root = process.env.GM_LOG_DIR || path.join(os.homedir(), '.claude', 'gm-log');
    const day = new Date().toISOString().slice(0, 10);
    const dir = path.join(root, day);
    fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(), sub: subsystem, event,
      pid: process.pid, sess: process.env.CLAUDE_SESSION_ID || process.env.GM_SESSION_ID || '',
      ...fields,
    });
    fs.appendFileSync(path.join(dir, `${subsystem}.jsonl`), line + '\n');
  } catch (_) {}
}

function writeBootstrapError(spec) {
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const spoolDir = path.join(projectDir, '.gm', 'exec-spool');
    fs.mkdirSync(spoolDir, { recursive: true });
    fs.writeFileSync(path.join(spoolDir, '.bootstrap-error.json'), JSON.stringify({ ts: new Date().toISOString(), ...spec }, null, 2));
  } catch (_) {}
}

function clearBootstrapError() {
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    fs.unlinkSync(path.join(projectDir, '.gm', 'exec-spool', '.bootstrap-error.json'));
  } catch (_) {}
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

function cacheRoot() {
  const home = os.homedir();
  if (process.env.PLUGKIT_CACHE_DIR) return process.env.PLUGKIT_CACHE_DIR;
  if (os.platform() === 'win32') {
    const base = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return path.join(base, 'plugkit', 'bin');
  }
  if (os.platform() === 'darwin') return path.join(home, 'Library', 'Caches', 'plugkit', 'bin');
  const xdg = process.env.XDG_CACHE_HOME || path.join(home, '.cache');
  return path.join(xdg, 'plugkit', 'bin');
}

function fallbackCacheRoot() {
  return path.join(os.tmpdir(), 'plugkit-cache', 'bin');
}

function gmToolsDir() {
  const home = process.env.USERPROFILE || process.env.HOME || os.homedir();
  return path.join(home, '.claude', 'gm-tools');
}

function readVersionFile() {
  const p = path.join(wrapperDir, 'plugkit.version');
  if (!fs.existsSync(p)) throw new Error(`plugkit.version not found at ${p}`);
  return fs.readFileSync(p, 'utf8').trim();
}

function readShaManifest() {
  const p = path.join(wrapperDir, 'plugkit.sha256');
  if (!fs.existsSync(p)) return null;
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([0-9a-f]{64})\s+(\S+)\s*$/i);
    if (m) out[m[2]] = m[1].toLowerCase();
  }
  return out;
}

function sha256OfFileSync(filePath) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(1024 * 1024);
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n <= 0) break;
      h.update(buf.subarray(0, n));
    }
  } finally { try { fs.closeSync(fd); } catch (_) {} }
  return h.digest('hex');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
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
        if (Number.isFinite(owner) && owner !== process.pid && !pidAlive(owner)) stale = true;
      } catch (_) { stale = true; }
      if (stale) {
        try { fs.unlinkSync(lockPath); } catch (_) {}
        continue;
      }
      if (Date.now() - start > ATTEMPT_TIMEOUT_MS) throw new Error(`lock wait timeout: ${lockPath}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
    }
  }
}

function releaseLock(lockPath) {
  try { fs.unlinkSync(lockPath); } catch (_) {}
}

function sha256OfFile(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    const s = fs.createReadStream(filePath);
    s.on('data', c => h.update(c));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

async function extractNpmPackageWasm(destPath, version) {
  const tempDir = path.join(path.dirname(destPath), '.npm-extract-' + Date.now());
  try {
    ensureDir(tempDir);
    const startMs = Date.now();
    log(`extracting npm package ${NPM_PACKAGE}@${version} to ${tempDir}`);
    obsEvent('bootstrap', 'npm.extract.start', { package: NPM_PACKAGE, version });

    const result = spawnSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      [NPM_PACKAGE + '@' + version, '--prefix', tempDir],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: ATTEMPT_TIMEOUT_MS,
        encoding: 'utf8',
        windowsHide: true,
      }
    );

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`npx extraction failed: ${result.stderr || result.stdout || 'unknown error'}`);
    }

    const nodeModulesPath = path.join(tempDir, 'node_modules', NPM_PACKAGE, 'plugkit.wasm');
    if (!fs.existsSync(nodeModulesPath)) {
      throw new Error(`plugkit.wasm not found in extracted npm package at ${nodeModulesPath}`);
    }

    fs.copyFileSync(nodeModulesPath, destPath);
    log(`extracted ${nodeModulesPath} → ${destPath}`);
    obsEvent('bootstrap', 'npm.extract.end', { dur_ms: Date.now() - startMs, ok: true });
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 1, retryDelay: 50 }); } catch (_) {}
  }
}

async function extractNpmPackageWithRetry(destPath, version) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      log(`npm extract attempt ${attempt}/${MAX_ATTEMPTS}: ${NPM_PACKAGE}@${version}`);
      await extractNpmPackageWasm(destPath, version);
      return;
    } catch (err) {
      lastErr = err;
      log(`attempt ${attempt} failed: ${err.message}`);
      obsEvent('bootstrap', 'npm.extract.attempt_failed', { package: NPM_PACKAGE, attempt, max: MAX_ATTEMPTS, err: String(err.message || err) });
      if (attempt < MAX_ATTEMPTS) {
        const wait = BACKOFF_MS[attempt - 1] || 120000;
        log(`backing off ${wait}ms`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

function killHoldersOfPath(targetPath) {
  if (process.platform !== 'win32') return 0;
  try {
    const norm = path.resolve(targetPath).replace(/\//g, '\\');
    const r = spawnSync('wmic', ['process', 'where', `ExecutablePath='${norm.replace(/\\/g, '\\\\')}'`, 'get', 'ProcessId', '/format:value'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    if (r.status !== 0 || !r.stdout) return 0;
    const pids = [];
    for (const line of r.stdout.split(/\r?\n/)) {
      const m = line.match(/ProcessId=(\d+)/);
      if (m) {
        const pid = parseInt(m[1], 10);
        if (Number.isFinite(pid) && pid !== process.pid) pids.push(pid);
      }
    }
    for (const pid of pids) {
      try { spawnSync('taskkill', ['/F', '/PID', String(pid)], { windowsHide: true, timeout: 3000 }); } catch (_) {}
    }
    return pids.length;
  } catch (_) { return 0; }
}

function renameWithRetry(src, dst, attempts) {
  for (let i = 0; i < attempts; i++) {
    try { fs.renameSync(src, dst); return true; }
    catch (err) {
      if (err.code !== 'EEXIST' && err.code !== 'EPERM' && err.code !== 'EBUSY' && err.code !== 'EACCES') throw err;
      if (i === Math.floor(attempts / 2)) killHoldersOfPath(dst);
      try { spawnSync(process.execPath, ['-e', 'setTimeout(()=>{}, 200)'], { timeout: 400, killSignal: 'SIGKILL', stdio: 'ignore', windowsHide: true }); } catch (_) {}
    }
  }
  return false;
}

function copyToGmTools(finalPath, version) {
  const dst = gmToolsDir();
  fs.mkdirSync(dst, { recursive: true });
  const exeName = process.platform === 'win32' ? 'plugkit.exe' : 'plugkit';
  const target = path.join(dst, exeName);
  const targetTmp = target + '.new';

  if (fs.existsSync(target)) {
    let needsRefresh = true;
    try {
      const cur = sha256OfFileSync(target);
      const src = sha256OfFileSync(finalPath);
      if (cur === src) needsRefresh = false;
    } catch (_) {}
    if (!needsRefresh) {
      try { fs.writeFileSync(path.join(dst, 'plugkit.version'), version); } catch (_) {}
      return;
    }
    try { killHoldersOfPath(target); } catch (_) {}
  }

  fs.copyFileSync(finalPath, targetTmp);
  if (!renameWithRetry(targetTmp, target, 8)) {
    try { killHoldersOfPath(target); } catch (_) {}
    try { fs.unlinkSync(target); } catch (_) {}
    try { fs.renameSync(targetTmp, target); }
    catch (_) {
      try { fs.unlinkSync(targetTmp); } catch (_) {}
      throw new Error(`gm-tools update blocked: cannot replace ${target}`);
    }
  }
  if (process.platform !== 'win32') {
    try { fs.chmodSync(target, 0o755); } catch (_) {}
  }
  fs.writeFileSync(path.join(dst, 'plugkit.version'), version);
}

function rtkBinaryName() {
  const key = platformKey();
  return key.startsWith('win32') ? `rtk-${key}.exe` : `rtk-${key}`;
}

function readRtkVersion() {
  const p = path.join(wrapperDir, 'rtk.version');
  if (!fs.existsSync(p)) return null;
  const v = fs.readFileSync(p, 'utf8').trim();
  return v || null;
}

function rtkCacheDir(root, plugkitVerDir) {
  const rtkVer = readRtkVersion();
  if (!rtkVer) return plugkitVerDir;
  const dir = path.join(root, `rtk-v${rtkVer}`);
  ensureDir(dir);
  return dir;
}

function healIfShaMatches(binPath, expectedSha, sentinelPath, partialPath, kind) {
  if (!fs.existsSync(binPath)) return false;
  if (partialPath) { try { if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath); } catch (_) {} }
  if (!expectedSha) return false;
  let got;
  try { got = sha256OfFileSync(binPath); }
  catch (_) { return false; }
  if (got !== expectedSha) {
    try { fs.unlinkSync(binPath); } catch (_) {}
    return false;
  }
  try { fs.writeFileSync(sentinelPath, new Date().toISOString()); } catch (_) { return false; }
  obsEvent('bootstrap', 'cache.heal', { path: binPath, kind });
  return true;
}

function daemonVersionSentinel() {
  const root = (() => {
    try { const r = cacheRoot(); ensureDir(r); return r; }
    catch (_) { const r = fallbackCacheRoot(); ensureDir(r); return r; }
  })();
  return path.join(root, '.daemon-version');
}

function readDaemonVersion() {
  try { return fs.readFileSync(daemonVersionSentinel(), 'utf8').trim(); }
  catch (_) { return null; }
}

function writeDaemonVersion(v) {
  try { fs.writeFileSync(daemonVersionSentinel(), String(v)); } catch (_) {}
}

function killPid(pid) {
  if (!Number.isFinite(pid) || pid === process.pid || !pidAlive(pid)) return false;
  try { process.kill(pid, 'SIGTERM'); }
  catch (_) { try { process.kill(pid); } catch (_) {} }
  if (os.platform() === 'win32' && pidAlive(pid)) {
    try { spawnSync('taskkill', ['/F', '/PID', String(pid)], { stdio: 'ignore', windowsHide: true, timeout: 3000, killSignal: 'SIGKILL' }); } catch (_) {}
  }
  return true;
}

function killRunningDaemons(reason) {
  const tmp = os.tmpdir();
  const killedPids = [];
  for (const pidFile of ['glootie-runner.pid', 'plugkit-runner.pid']) {
    const pidPath = path.join(tmp, pidFile);
    if (!fs.existsSync(pidPath)) continue;
    try {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
      if (killPid(pid)) {
        killedPids.push(pid);
        obsEvent('bootstrap', 'daemon.killed', { pid, pidFile, reason });
      }
      try { fs.unlinkSync(pidPath); } catch (_) {}
    } catch (_) {}
  }
  return killedPids;
}

function killSpoolWatcherInCwd(reason) {
  try {
    const pidPath = path.join(process.cwd(), '.gm', 'exec-spool', '.watcher.pid');
    if (!fs.existsSync(pidPath)) return null;
    const pid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
    if (killPid(pid)) {
      obsEvent('bootstrap', 'watcher.killed', { pid, reason });
      try { fs.unlinkSync(pidPath); } catch (_) {}
      return pid;
    }
    try { fs.unlinkSync(pidPath); } catch (_) {}
  } catch (_) {}
  return null;
}

function listRunningPlugkitImagePaths() {
  const out = [];
  try {
    if (os.platform() === 'win32') {
      let parsed = null;
      try {
        const p = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', "Get-Process plugkit* -ErrorAction SilentlyContinue | Select-Object Id,Path | ConvertTo-Json -Compress"], { windowsHide: true, encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL', stdio: ['ignore', 'pipe', 'pipe'] });
        const text = ((p && p.stdout) || '').trim();
        if (text) {
          const j = JSON.parse(text);
          parsed = Array.isArray(j) ? j : [j];
        }
      } catch (_) {}
      if (parsed) {
        for (const item of parsed) {
          if (!item) continue;
          const pid = parseInt(item.Id, 10);
          if (!Number.isFinite(pid)) continue;
          out.push({ pid, path: (item.Path || '').trim() });
        }
      } else {
        const r = spawnSync('tasklist', ['/FI', 'IMAGENAME eq plugkit*', '/FO', 'CSV', '/NH'], { windowsHide: true, encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL', stdio: ['ignore', 'pipe', 'pipe'] });
        const text = (r && r.stdout) || '';
        const seen = new Set();
        for (const line of text.split(/\r?\n/)) {
          const m = line.match(/^"([^"]+)","(\d+)"/);
          if (!m) continue;
          const pid = parseInt(m[2], 10);
          if (!Number.isFinite(pid) || seen.has(pid)) continue;
          seen.add(pid);
          out.push({ pid, path: '' });
        }
      }
    } else if (os.platform() === 'linux') {
      let entries = [];
      try { entries = fs.readdirSync('/proc'); } catch (_) {}
      for (const e of entries) {
        if (!/^\d+$/.test(e)) continue;
        const pid = parseInt(e, 10);
        let comm = '';
        try { comm = fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim(); } catch (_) { continue; }
        if (!/^plugkit/i.test(comm)) continue;
        let imagePath = '';
        try { imagePath = fs.readlinkSync(`/proc/${pid}/exe`); } catch (_) {}
        out.push({ pid, path: imagePath });
      }
    } else {
      const r = spawnSync('ps', ['-axo', 'pid=,comm='], { encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL', stdio: ['ignore', 'pipe', 'pipe'] });
      const text = (r && r.stdout) || '';
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*(\d+)\s+(.+?)\s*$/);
        if (!m) continue;
        if (!/plugkit/i.test(m[2])) continue;
        const pid = parseInt(m[1], 10);
        let imagePath = '';
        try {
          const p = spawnSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8', timeout: 3000, killSignal: 'SIGKILL', stdio: ['ignore', 'pipe', 'pipe'] });
          imagePath = ((p && p.stdout) || '').trim().split(/\s+/)[0] || '';
        } catch (_) {}
        out.push({ pid, path: imagePath });
      }
    }
  } catch (_) {}
  return out;
}

function isLockStale(lockPath) {
  try {
    const st = fs.statSync(lockPath);
    if (Date.now() - st.mtimeMs > LOCK_STALE_MS) return true;
    const owner = parseInt(fs.readFileSync(lockPath, 'utf8').trim(), 10);
    if (Number.isFinite(owner) && !pidAlive(owner)) return true;
  } catch (_) { return true; }
  return false;
}

function pruneOldVersions(root, keepVersion, keepRtkVersion) {
  try {
    const entries = fs.readdirSync(root);
    for (const e of entries) {
      const isPlugkit = e.startsWith('v') && !e.startsWith('rtk-');
      const isRtk = e.startsWith('rtk-v');
      if (!isPlugkit && !isRtk) continue;
      if (isPlugkit && e === `v${keepVersion}`) continue;
      if (isRtk && keepRtkVersion && e === `rtk-v${keepRtkVersion}`) continue;
      const dir = path.join(root, e);
      const lock = path.join(dir, '.lock');
      if (fs.existsSync(lock) && !isLockStale(lock)) continue;
      if (fs.existsSync(lock)) { try { fs.unlinkSync(lock); } catch (_) {} }
      try {
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 1, retryDelay: 50 });
        log(`pruned ${dir}`);
      } catch (err) { log(`prune skip ${dir}: ${err.message}`); }
    }
  } catch (_) {}
}

function proactiveKillForNewInstall(installedVersion, finalPath) {
  try {
    const reason = `install:v${installedVersion}`;
    const target = finalPath ? path.resolve(finalPath).toLowerCase() : null;
    const cacheRootNorm = (() => {
      try { return path.resolve(cacheRoot()).toLowerCase(); } catch (_) { return null; }
    })();
    const procs = listRunningPlugkitImagePaths();
    for (const { pid, path: imagePath } of procs) {
      if (!Number.isFinite(pid) || pid === process.pid) continue;
      if (!imagePath) continue;
      const norm = path.resolve(imagePath).toLowerCase();
      if (target && norm === target) continue;
      if (!cacheRootNorm || !norm.startsWith(cacheRootNorm + path.sep.toLowerCase())) continue;
      if (killPid(pid)) {
        try { process.stderr.write(`[bootstrap] killed stale daemon pid=${pid} path=${imagePath} (current install: v${installedVersion})\n`); } catch (_) {}
        obsEvent('bootstrap', 'daemon.killed', { pid, oldPath: imagePath, installedVersion, mechanism: 'process-path' });
      }
    }
    killRunningDaemons(reason);
    killSpoolWatcherInCwd(reason);
    writeDaemonVersion(installedVersion);
  } catch (_) {}
}

function killStaleDaemonIfVersionChanged() {
  let currentVersion;
  try { currentVersion = readVersionFile(); } catch (_) { return; }
  const cached = resolveCachedBinary({ version: currentVersion });
  if (cached) {
    proactiveKillForNewInstall(currentVersion, cached);
    return;
  }
  const recorded = readDaemonVersion();
  if (recorded === currentVersion) return;
  if (recorded) killRunningDaemons(`version_change:${recorded}->${currentVersion}`);
  writeDaemonVersion(currentVersion);
}

function resolveCachedBinary(opts) {
  opts = opts || {};
  const version = opts.version || readVersionFile();
  const root = (() => {
    try { const r = cacheRoot(); ensureDir(r); return r; }
    catch (_) { const r = fallbackCacheRoot(); ensureDir(r); return r; }
  })();
  const verDir = path.join(root, `v${version}`);
  const finalPath = path.join(verDir, binaryName());
  const okSentinel = path.join(verDir, '.ok');
  if (fs.existsSync(finalPath) && fs.existsSync(okSentinel)) return finalPath;
  return null;
}

function resolveCachedRtk() {
  const version = readVersionFile();
  const root = (() => {
    try { const r = cacheRoot(); ensureDir(r); return r; }
    catch (_) { const r = fallbackCacheRoot(); ensureDir(r); return r; }
  })();
  const plugkitVerDir = path.join(root, `v${version}`);
  const cacheDir = rtkCacheDir(root, plugkitVerDir);
  const rtkPath = path.join(cacheDir, rtkBinaryName());
  const rtkOk = path.join(cacheDir, '.rtk-ok');
  if (fs.existsSync(rtkPath) && fs.existsSync(rtkOk)) return rtkPath;
  return null;
}

async function bootstrapRtk(plugkitVerDir, plugkitVersion, silent, root) {
  const rtkName = rtkBinaryName();
  const cacheDir = rtkCacheDir(root || cacheRoot(), plugkitVerDir);
  const rtkPath = path.join(cacheDir, rtkName);
  const rtkOk = path.join(cacheDir, '.rtk-ok');
  if (fs.existsSync(rtkPath) && fs.existsSync(rtkOk)) {
    if (!silent) log(`rtk cache hit: ${rtkPath}`);
    return rtkPath;
  }
  const rtkSha = readShaManifest();
  // rtk.sha256 may be in a separate file
  const rtkShaPath = path.join(wrapperDir, 'rtk.sha256');
  let expected = null;
  if (fs.existsSync(rtkShaPath)) {
    expected = fs.readFileSync(rtkShaPath, 'utf8').trim();
  }
  const tmp = `${rtkPath}.partial`;
  if (healIfShaMatches(rtkPath, expected, rtkOk, tmp, 'rtk')) {
    if (!silent) log(`rtk cache heal (sha match): ${rtkPath}`);
    return rtkPath;
  }
  const RTKS_RELEASE_REPO = 'AnEntrypoint/plugkit-bin';
  const url = `https://github.com/${RTKS_RELEASE_REPO}/releases/download/v${plugkitVersion}/${rtkName}`;
  const startMs = Date.now();
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      log(`rtk download attempt ${attempt}/${MAX_ATTEMPTS}: ${url}`);
      const result = spawnSync(
        'curl',
        ['-fSL', '--max-time', String(Math.floor(ATTEMPT_TIMEOUT_MS / 1000)), '-o', tmp, url],
        { stdio: 'pipe', timeout: ATTEMPT_TIMEOUT_MS + 5000, windowsHide: true }
      );
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`curl failed with status ${result.status}`);
      break;
    } catch (err) {
      lastErr = err;
      log(`rtk attempt ${attempt} failed: ${err.message}`);
      obsEvent('bootstrap', 'rtk.download.attempt_failed', { attempt, max: MAX_ATTEMPTS, err: String(err.message || err) });
      if (attempt < MAX_ATTEMPTS) {
        const wait = BACKOFF_MS[attempt - 1] || 120000;
        log(`backing off ${wait}ms`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  if (lastErr) throw lastErr;
  if (expected) {
    const got = await sha256OfFile(tmp);
    if (got !== expected) {
      try { fs.unlinkSync(tmp); } catch (_) {}
      throw new Error(`rtk sha256 mismatch: expected ${expected}, got ${got}`);
    }
  }
  try { fs.renameSync(tmp, rtkPath); }
  catch (err) {
    if (err.code === 'EEXIST' || err.code === 'EPERM') {
      try { fs.unlinkSync(rtkPath); } catch (_) {}
      fs.renameSync(tmp, rtkPath);
    } else throw err;
  }
  if (os.platform() !== 'win32') { try { fs.chmodSync(rtkPath, 0o755); } catch (_) {} }
  fs.writeFileSync(rtkOk, new Date().toISOString());
  log(`installed ${rtkPath}`);
  obsEvent('bootstrap', 'install.done', { path: rtkPath, plugkit_version: plugkitVersion, rtk_version: readRtkVersion() || plugkitVersion, kind: 'rtk', dur_ms: Date.now() - startMs });
  return rtkPath;
}

function spawnDetachedRtkFetch() {
  try {
    const child = spawn(process.execPath, [__filename, '--rtk-only'], {
      detached: true, stdio: 'ignore', windowsHide: true,
    });
    child.unref();
    obsEvent('bootstrap', 'rtk.detached.spawned', { pid: child.pid });
  } catch (err) {
    log(`rtk detach spawn failed: ${err.message}`);
  }
}

async function bootstrap(opts) {
  opts = opts || {};
  const version = readVersionFile();
  const shaManifest = readShaManifest();
  const binName = binaryName();
  const expectedSha = shaManifest ? shaManifest[binName] : null;

  let root = cacheRoot();
  try { ensureDir(root); }
  catch (_) { root = fallbackCacheRoot(); ensureDir(root); }

  const verDir = path.join(root, `v${version}`);
  ensureDir(verDir);

  const finalPath = path.join(verDir, binName);
  const okSentinel = path.join(verDir, '.ok');
  const partialPath = `${finalPath}.partial`;

  if (fs.existsSync(finalPath) && fs.existsSync(okSentinel)) {
    if (expectedSha) {
      const actualSha = sha256OfFileSync(finalPath);
      if (actualSha === expectedSha) {
        obsEvent('bootstrap', 'decision.hit', { reason: 'sha-match', version, path: finalPath });
        copyToGmTools(finalPath, version);
        clearBootstrapError();
        return finalPath;
      }
      log(`decision: fetch reason: cache-hit-sha-mismatch (dir=v${version} expected ${expectedSha.slice(0,12)}... got ${(actualSha||'').slice(0,12)}...)`);
      writeBootstrapError({
        expected_version: version, cached_version: null,
        error_phase: 'cache-hit-sha-mismatch',
        error_message: `cached binary at ${finalPath} sha=${actualSha} but manifest expects ${expectedSha}`,
      });
      try { fs.unlinkSync(finalPath); } catch (_) {}
      try { fs.unlinkSync(okSentinel); } catch (_) {}
    } else {
      obsEvent('bootstrap', 'decision.hit', { reason: 'sentinel+no-sha-manifest', path: finalPath });
      copyToGmTools(finalPath, version);
      clearBootstrapError();
      return finalPath;
    }
  }

  if (healIfShaMatches(finalPath, expectedSha, okSentinel, partialPath, 'plugkit')) {
    obsEvent('bootstrap', 'decision.heal', { reason: 'sha-match', path: finalPath });
    spawnDetachedRtkFetch();
    copyToGmTools(finalPath, version);
    clearBootstrapError();
    return finalPath;
  }

  const lockPath = path.join(verDir, '.lock');
  acquireLock(lockPath);
  try {
    if (fs.existsSync(finalPath) && fs.existsSync(okSentinel)) {
      obsEvent('bootstrap', 'decision.hit', { reason: 'lock-race-resolved', path: finalPath });
      copyToGmTools(finalPath, version);
      clearBootstrapError();
      return finalPath;
    }
    if (healIfShaMatches(finalPath, expectedSha, okSentinel, partialPath, 'plugkit')) {
      obsEvent('bootstrap', 'decision.heal', { reason: 'sha-match-under-lock', path: finalPath });
      spawnDetachedRtkFetch();
      copyToGmTools(finalPath, version);
      clearBootstrapError();
      return finalPath;
    }

    if (fs.existsSync(partialPath)) {
      try {
        const st = fs.statSync(partialPath);
        if (Date.now() - st.mtimeMs > LOCK_STALE_MS) {
          fs.unlinkSync(partialPath);
          log(`cleared stale partial: ${partialPath}`);
        }
      } catch (_) {}
    }
    try {
      await extractNpmPackageWithRetry(partialPath, version);
    } catch (extractErr) {
      writeBootstrapError({
        expected_version: version, cached_version: null,
        error_phase: 'npm-extract',
        error_message: extractErr && extractErr.message ? extractErr.message : String(extractErr),
      });
      throw extractErr;
    }

    if (expectedSha) {
      const got = await sha256OfFile(partialPath);
      if (got !== expectedSha) {
        try { fs.unlinkSync(partialPath); } catch (_) {}
        writeBootstrapError({
          expected_version: version, cached_version: null,
          error_phase: 'sha256-mismatch',
          error_message: `sha256 mismatch for ${binName}: expected ${expectedSha}, got ${got}`,
        });
        throw new Error(`sha256 mismatch for ${binName}: expected ${expectedSha}, got ${got}`);
      }
      log('sha256 verified');
    } else {
      log('no sha256 manifest — skipping verify');
    }

    try { fs.renameSync(partialPath, finalPath); }
    catch (err) {
      if (err.code === 'EEXIST' || err.code === 'EPERM') {
        try { fs.unlinkSync(finalPath); } catch (_) {}
        fs.renameSync(partialPath, finalPath);
      } else throw err;
    }

    if (os.platform() !== 'win32') {
      try { fs.chmodSync(finalPath, 0o755); } catch (_) {}
    }

    fs.writeFileSync(okSentinel, new Date().toISOString());
    log(`decision: fetch reason: install-complete (${finalPath})`);
    obsEvent('bootstrap', 'install.done', { path: finalPath, version, kind: 'plugkit' });
    proactiveKillForNewInstall(version, finalPath);
    pruneOldVersions(root, version, readRtkVersion());
    spawnDetachedRtkFetch();
    copyToGmTools(finalPath, version);
    clearBootstrapError();
    return finalPath;
  } finally {
    releaseLock(lockPath);
  }
}

function getBinaryPath() {
  const home = process.env.USERPROFILE || process.env.HOME || os.homedir();
  const exe = process.platform === 'win32' ? 'plugkit.exe' : 'plugkit';
  return path.join(home, '.claude', 'gm-tools', exe);
}

function isReady() {
  const bin = getBinaryPath();
  if (!fs.existsSync(bin)) return false;
  try {
    const r = spawnSync(bin, ['--version'], { timeout: 3000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    return r.status === 0;
  } catch (_) { return false; }
}

function startSpoolDaemon() {
  const bin = getBinaryPath();
  if (!fs.existsSync(bin)) return { ok: false, error: 'binary not found' };

  const pidFile = path.join(os.tmpdir(), 'gm-plugkit-spool.pid');
  if (fs.existsSync(pidFile)) {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
    if (Number.isFinite(pid) && pidAlive(pid)) {
      return { ok: true, pid, status: 'already-running' };
    }
    try { fs.unlinkSync(pidFile); } catch (_) {}
  }

  const child = spawn(bin, ['spool'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();

  try { fs.writeFileSync(pidFile, String(child.pid)); } catch (_) {}
  return { ok: true, pid: child.pid, status: 'started' };
}

async function ensureReady() {
  if (isReady()) {
    return { ok: true, binaryPath: getBinaryPath(), status: 'already-ready' };
  }
  const binaryPath = await bootstrap();
  return { ok: true, binaryPath, status: 'bootstrapped' };
}

module.exports = {
  bootstrap,
  ensureReady,
  startSpoolDaemon,
  getBinaryPath,
  isReady,
  platformKey,
  binaryName,
  rtkBinaryName,
  cacheRoot,
  obsEvent,
  killRunningDaemons,
  killStaleDaemonIfVersionChanged,
  killSpoolWatcherInCwd,
  proactiveKillForNewInstall,
  resolveCachedBinary,
  resolveCachedRtk,
  bootstrapRtk,
  readDaemonVersion,
  writeDaemonVersion,
  daemonVersionSentinel,
};

if (require.main === module) {
  (async () => {
    try {
      const args = process.argv.slice(2);
      if (args.includes('--rtk-only')) {
        const version = readVersionFile();
        let root = cacheRoot();
        try { ensureDir(root); }
        catch (_) { root = fallbackCacheRoot(); ensureDir(root); }
        const verDir = path.join(root, `v${version}`);
        ensureDir(verDir);
        await bootstrapRtk(verDir, version, true, root);
        process.exit(0);
      } else if (args.includes('--daemon')) {
        const result = await ensureReady();
        if (!result.ok) {
          console.error('Bootstrap failed:', result.error);
          process.exit(1);
        }
        const daemon = startSpoolDaemon();
        console.log(JSON.stringify({ bootstrap: result, daemon }));
        process.exit(0);
      } else if (args.includes('--binary')) {
        const result = await ensureReady();
        if (result.ok) {
          console.log(result.binaryPath);
          process.exit(0);
        } else {
          console.error('Bootstrap failed:', result.error);
          process.exit(1);
        }
      } else if (args.includes('--status')) {
        console.log(JSON.stringify({
          ready: isReady(),
          binaryPath: getBinaryPath(),
          platform: platformKey(),
          daemonVersion: readDaemonVersion(),
          cachedRtk: resolveCachedRtk(),
        }));
        process.exit(0);
      } else {
        const result = await ensureReady();
        const daemon = startSpoolDaemon();
        console.log(JSON.stringify({ bootstrap: result, daemon }));
        process.exit(result.ok && daemon.ok ? 0 : 1);
      }
    } catch (err) {
      obsEvent('bootstrap', 'fatal', { err: String(err.message || err) });
      try {
        const pinned = (() => { try { return readVersionFile(); } catch (_) { return null; } })();
        writeBootstrapError({
          expected_version: pinned, cached_version: null,
          error_phase: 'fatal', error_message: String(err && err.message || err),
        });
      } catch (_) {}
      console.error('gm-plugkit bootstrap failed:', err.message);
      process.exit(1);
    }
  })();
}
