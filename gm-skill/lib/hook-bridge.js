const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let watcherProc = null;

function resolvePlugkitJs() {
  const local = path.join(process.cwd(), 'gm-starter', 'bin', 'plugkit.js');
  if (fs.existsSync(local)) return local;
  return path.join(__dirname, '..', '..', 'gm-starter', 'bin', 'plugkit.js');
}

function rsPlugkitPath() {
  const local = path.join(__dirname, '..', 'bin', 'rs-plugkit.js');
  if (fs.existsSync(local)) return local;
  return path.join(__dirname, '..', '..', 'gm-skill', 'bin', 'rs-plugkit.js');
}

function getPlugkitBinary() {
  const home = os.homedir();
  const exe = process.platform === 'win32' ? 'plugkit.exe' : 'plugkit';
  const p = path.join(home, '.claude', 'gm-tools', exe);
  return fs.existsSync(p) ? p : null;
}

function ensurePlugkit(silent) {
  const rpk = rsPlugkitPath();
  if (fs.existsSync(rpk)) {
    const r = spawnSync('node', [rpk, 'ensure'], {
      cwd: __dirname,
      encoding: 'utf8',
      timeout: 300000,
      windowsHide: true,
    });
    return r.status === 0;
  }
  // Fallback to legacy plugkit.js
  const pk = resolvePlugkitJs();
  const r = spawnSync('node', [pk, 'hook', 'session-start'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 300000,
    windowsHide: true,
  });
  return r.status === 0;
}

function runHook(subcommand, options = {}) {
  const binary = getPlugkitBinary();

  // If binary exists, use it directly (fast hot path)
  if (binary && subcommand !== 'session-start' && subcommand !== 'prompt-submit') {
    const args = ['hook', subcommand];
    const env = Object.assign({}, process.env, options.env || {});
    const result = spawnSync(binary, args, {
      cwd: options.cwd || process.cwd(),
      env,
      encoding: 'utf8',
      timeout: options.timeoutMs || 30000,
      windowsHide: true,
    });
    return {
      ok: result.status === 0,
      status: result.status,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      error: result.error ? result.error.message : null,
    };
  }

  // For session-start and prompt-submit, ensure binary is ready first, then use it
  if (binary) {
    const args = ['hook', subcommand];
    const env = Object.assign({}, process.env, options.env || {});
    const result = spawnSync(binary, args, {
      cwd: options.cwd || process.cwd(),
      env,
      encoding: 'utf8',
      timeout: options.timeoutMs || 120000,
      windowsHide: true,
    });
    return {
      ok: result.status === 0,
      status: result.status,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      error: result.error ? result.error.message : null,
    };
  }

  // Fallback: use plugkit.js wrapper which bootstraps
  const plugkitJs = resolvePlugkitJs();
  const args = [plugkitJs, 'hook', subcommand];
  const env = Object.assign({}, process.env, options.env || {});
  const result = spawnSync('node', args, {
    cwd: options.cwd || process.cwd(),
    env,
    encoding: 'utf8',
    timeout: options.timeoutMs || 120000,
    windowsHide: true,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : null,
  };
}

/**
 * Start the plugkit file watcher daemon.
 * Uses plugkit's built-in runner/watch mode.
 * If no binary available, bootstraps via rs-plugkit or plugkit.js.
 */
function startWatcher(cwd) {
  cwd = cwd || process.cwd();
  const binary = getPlugkitBinary();

  if (!binary) {
    // Bootstrap first
    const ok = ensurePlugkit(false);
    if (!ok) {
      console.error('[hook-bridge] plugkit bootstrap failed, cannot start watcher');
      return null;
    }
  }

  const bin = binary || getPlugkitBinary();
  if (!bin) return null;

  // Use plugkit's runner in watch mode for the exec-spool directory
  const spoolIn = path.join(cwd, '.gm', 'exec-spool', 'in');
  const spoolOut = path.join(cwd, '.gm', 'exec-spool', 'out');

  // Ensure directories exist
  fs.mkdirSync(spoolIn, { recursive: true });
  fs.mkdirSync(spoolOut, { recursive: true });

  // Start the watcher process detached
  try {
    // Try watch mode first (rs-plugkit v2+ or plugkit with runner support)
    const proc = spawn(bin, ['runner', '--watch', spoolIn, '--out', spoolOut], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      cwd,
    });
    proc.unref();
    watcherProc = proc;
    return proc.pid;
  } catch (e) {
    // Fallback: just ensure the binary is present for on-demand hook execution
    console.error('[hook-bridge] watcher fallback, binary available for on-demand hooks:', bin);
    return null;
  }
}

function stopWatcher() {
  if (watcherProc) {
    try {
      watcherProc.kill();
    } catch {}
    watcherProc = null;
  }
}

function sessionStart(options = {}) {
  // Ensure plugkit is ready before first hook
  ensurePlugkit(false);
  return runHook('session-start', options);
}

function preToolUse(options = {}) { return runHook('pre-tool-use', options); }
function promptSubmit(options = {}) { return runHook('prompt-submit', options); }
function stop(options = {}) { return runHook('stop', options); }
function stopGit(options = {}) { return runHook('stop-git', options); }
function postToolUse(options = {}) { return runHook('post-tool-use', options); }

function skillLifecycle(options = {}) {
  const plugkitJs = resolvePlugkitJs();
  const args = [plugkitJs, 'skill-lifecycle'];
  if (options.sessionStart === false) args.push('--session-start=false');
  if (options.promptSubmit === false) args.push('--prompt-submit=false');
  if (options.preToolUse === false) args.push('--pre-tool-use=false');
  if (options.postToolUse === false) args.push('--post-tool-use=false');
  if (options.stop === true) args.push('--stop=true');
  if (options.stopGit === true) args.push('--stop-git=true');
  const env = Object.assign({}, process.env, options.env || {});
  const result = spawnSync('node', args, {
    cwd: options.cwd || process.cwd(),
    env,
    encoding: 'utf8',
    timeout: options.timeoutMs || 120000,
    windowsHide: true,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : null,
  };
}

module.exports = {
  runHook, sessionStart, preToolUse, promptSubmit, postToolUse,
  skillLifecycle, stop, stopGit, ensurePlugkit, startWatcher, stopWatcher,
  getPlugkitBinary
};