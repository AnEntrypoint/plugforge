#!/usr/bin/env node
'use strict';
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { bootstrap, resolveCachedBinary, resolveCachedRtk, obsEvent, killStaleDaemonIfVersionChanged } = require('./bootstrap');

const dir = __dirname;

function readPinnedVersion() {
  try { return fs.readFileSync(path.join(dir, 'plugkit.version'), 'utf8').trim(); } catch (_) { return null; }
}

function probeCachedVersion(binPath) {
  try {
    const r = spawnSync(binPath, ['--version'], { timeout: 3000, encoding: 'utf8', windowsHide: true });
    if (r.error) return null;
    const text = `${r.stdout || ''} ${r.stderr || ''}`.trim();
    const m = text.match(/(\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
  } catch (_) { return null; }
}

async function resolveBinaryWithPinCheck() {
  const cached = resolveCachedBinary({ wrapperDir: dir });
  if (!cached) return null;
  const pin = readPinnedVersion();
  if (!pin) return cached;
  const got = probeCachedVersion(cached);
  if (got && got === pin) return cached;
  try { return await bootstrap({ wrapperDir: dir, silent: true }); } catch (_) { return cached; }
}

function envWithRtkOnPath() {
  const rtkPath = resolveCachedRtk({ wrapperDir: dir });
  if (!rtkPath) return process.env;
  const rtkDir = path.dirname(rtkPath);
  const sep = process.platform === 'win32' ? ';' : ':';
  return { ...process.env, PATH: `${rtkDir}${sep}${process.env.PATH || ''}` };
}

async function resolveBinary() {
  const cached = resolveCachedBinary({ wrapperDir: dir });
  if (cached) return cached;
  return await bootstrap({ wrapperDir: dir });
}

async function main() {
  const args = process.argv.slice(2);
  // Detached bootstrap entry: just run bootstrap() and exit. Used by session-start
  // to avoid blocking CC startup on a slow GitHub download.
  if (args[0] === '__rtk_only__') {
    try { await bootstrap({ wrapperDir: dir, silent: false }); }
    catch (e) { try { process.stderr.write(`[plugkit-bootstrap-detached] ${e.message}\n`); } catch (_) {} }
    process.exit(0);
  }
  const isHook = args[0] === 'hook';
  const startedAt = Date.now();
  obsEvent('plugkit_wrapper', 'invoke', { argv: args.slice(0, 4), is_hook: isHook });
  // If the plugin tarball updated `plugkit.version` since the runner daemon
  // was last started, kill the daemon so the next `runner start` picks up
  // the freshly-installed binary instead of serving stale RPCs.
  try { killStaleDaemonIfVersionChanged(dir); } catch (_) {}
  let bin;
  try {
    const hookSubcmd = isHook ? (args[1] || '') : '';
    // session-start ALWAYS bootstraps: this is the once-per-session moment
    // where we guarantee the cached binary matches the wrapper-pinned version.
    // If the bootstrap fails (offline) we fall through to whatever the cache
    // currently has — the hook itself isn't blocking, just refreshing.
    if (isHook && hookSubcmd === 'session-start') {
      obsEvent('plugkit_wrapper', 'hook_bootstrap_session_start', { argv: args.slice(0, 4) });
      // Bootstrap can stall 60s+ on a slow GitHub mirror — never block CC startup
      // on it. Detach into a background child; this hook returns immediately
      // with whatever cached binary exists. Subsequent hooks pick up the new
      // binary once the detached bootstrap completes.
      bin = resolveCachedBinary({ wrapperDir: dir }) || legacyFallback();
      try {
        const child = spawn(process.execPath, [__filename, '__rtk_only__'], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
          env: { ...process.env, PLUGKIT_BOOTSTRAP_DETACHED: '1' },
        });
        child.unref();
        obsEvent('plugkit_wrapper', 'session_start_bootstrap_detached', { pid: child.pid });
      } catch (e) {
        process.stderr.write(`[plugkit] detached bootstrap spawn failed: ${e.message}\n`);
      }
      // If no cached binary yet (fresh install with bootstrap still downloading),
      // skip running the session-start handler this turn — it will fire next
      // session-start once binary is in place.
      if (!bin) {
        process.stderr.write(`[plugkit] session-start skipped: binary not yet installed (bootstrap running in background).\n`);
        process.exit(0);
      }
    } else if (isHook) {
      bin = (await resolveBinaryWithPinCheck()) || legacyFallback();
      if (!bin) {
        process.stderr.write(`[plugkit] hook ${hookSubcmd} skipped: binary not yet installed. Bootstrap will run on session-start.\n`);
        obsEvent('plugkit_wrapper', 'hook_skip_uncached', { argv: args.slice(0, 4), dur_ms: Date.now() - startedAt });
        process.exit(0);
      }
    } else {
      bin = await resolveBinary();
    }
  } catch (err) {
    process.stderr.write(`[plugkit] bootstrap failed: ${err.message}\n`);
    obsEvent('plugkit_wrapper', 'bootstrap_failed', { err: err.message, dur_ms: Date.now() - startedAt, argv: args.slice(0, 4), is_hook: isHook });
    const legacy = legacyFallback();
    if (legacy) { bin = legacy; }
    else if (isHook) { process.exit(0); }
    else process.exit(1);
  }

  const env = envWithRtkOnPath();

  if (isHook && !process.stdin.isTTY) {
    const chunks = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => {
      const child = spawn(bin, args, { stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true, env });
      child.stdin.end(Buffer.concat(chunks));
      child.on('close', code => process.exit(code ?? 1));
      child.on('error', () => process.exit(1));
    });
    process.stdin.on('error', () => process.exit(1));
  } else {
    const result = spawnSync(bin, args, { stdio: 'inherit', windowsHide: true, env });
    obsEvent('plugkit_wrapper', 'exit', { dur_ms: Date.now() - startedAt, code: result.status ?? -1 });
    process.exit(result.status ?? 1);
  }
}

// legacyFallback only returns a binary that lives next to the wrapper. We
// never reach across to ~/.claude/gm-tools/plugkit.exe or other ambient
// install dirs — those have proven to mask bootstrap failures by serving a
// stale version whose hooks silently mismatch the active wrapper code (see
// the v0.1.292-vs-v0.1.294 incident).
function legacyFallback() {
  const os = require('os');
  const p = os.platform();
  const a = os.arch();
  let candidates = [];
  if (p === 'win32') {
    candidates = [path.join(dir, a === 'arm64' ? 'plugkit-win32-arm64.exe' : 'plugkit-win32-x64.exe')];
  } else if (p === 'darwin') {
    candidates = [path.join(dir, a === 'arm64' ? 'plugkit-darwin-arm64' : 'plugkit-darwin-x64')];
  } else {
    candidates = [path.join(dir, (a === 'arm64' || a === 'aarch64') ? 'plugkit-linux-arm64' : 'plugkit-linux-x64')];
  }
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

main().catch(err => {
  process.stderr.write(`[plugkit] fatal: ${err.message}\n`);
  process.exit(1);
});
