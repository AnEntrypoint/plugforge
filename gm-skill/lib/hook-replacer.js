const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const os = require('os');

let watcherProc = null;
let watcherStarted = false;

function getGmDir(cwd) {
  return path.join(cwd || process.cwd(), '.gm');
}

function getSpoolDir(cwd) {
  return path.join(getGmDir(cwd), 'exec-spool');
}

function getToolsBin() {
  const home = os.homedir();
  const exe = process.platform === 'win32' ? 'plugkit.exe' : 'plugkit';
  return path.join(home, '.claude', 'gm-tools', exe);
}

function ensurePlugkitBinary() {
  const bin = getToolsBin();
  if (fs.existsSync(bin)) return true;

  const rsPlugkit = path.join(__dirname, '..', 'bin', 'rs-plugkit.js');
  if (!fs.existsSync(rsPlugkit)) return false;

  try {
    const r = spawnSync('node', [rsPlugkit, 'ensure'], {
      cwd: __dirname,
      encoding: 'utf8',
      timeout: 300000,
      windowsHide: true,
      stdio: 'pipe',
    });
    return r.status === 0 && fs.existsSync(bin);
  } catch (e) {
    return false;
  }
}

function startSpoolWatcher(cwd, options = {}) {
  if (watcherStarted) return watcherProc?.pid || 'polling';

  const gmDir = getGmDir(cwd);
  const inDir = path.join(gmDir, 'exec-spool', 'in');
  const outDir = path.join(gmDir, 'exec-spool', 'out');

  try {
    fs.mkdirSync(inDir, { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });
  } catch (e) {
    console.error('[hook-replacer] failed to create spool dirs:', e.message);
    return null;
  }

  const bin = getToolsBin();
  if (bin) {
    try {
      watcherProc = spawn(bin, ['runner', '--watch', inDir, '--out', outDir], {
        detached: true,
        stdio: options.stdio || 'ignore',
        windowsHide: true,
        cwd: cwd || process.cwd(),
      });
      watcherProc.unref();
      watcherStarted = true;
      return watcherProc.pid;
    } catch (e) {
      console.error('[hook-replacer] plugkit runner failed:', e.message);
    }
  }

  try {
    const chokidar = require('chokidar');
    const watcher = chokidar.watch(inDir, {
      persistent: true,
      ignoreInitial: true,
      depth: 2,
    });

    watcher.on('add', (filePath) => {
      processSpoolFile(filePath, outDir);
    });

    watcherProc = watcher;
    watcherStarted = true;
    return `poll:${inDir}`;
  } catch (e) {
    console.error('[hook-replacer] chokidar failed, trying native fs.watch:', e.message);
  }

  try {
    const nativeWatcher = fs.watch(inDir, { recursive: false }, (eventType, filename) => {
      if (!filename) return;
      processSpoolFile(path.join(inDir, filename), outDir);
    });
    
    try {
      fs.readdirSync(inDir).forEach(entry => {
        const subDir = path.join(inDir, entry);
        if (fs.statSync(subDir).isDirectory()) {
          try {
            fs.watch(subDir, { recursive: false }, (eventType, filename) => {
              if (!filename) return;
              processSpoolFile(path.join(subDir, filename), outDir);
            });
          } catch {}
        }
      });
    } catch {}

    watcherProc = nativeWatcher;
    watcherStarted = true;
    return `native-poll:${inDir}`;
  } catch (e) {
    console.error('[hook-replacer] native watch failed:', e.message);
    return null;
  }
}

function stopSpoolWatcher() {
  if (watcherProc) {
    try {
      if (typeof watcherProc.kill === 'function') {
        watcherProc.kill();
      } else if (typeof watcherProc.close === 'function') {
        watcherProc.close();
      }
    } catch (e) {
      console.error('[hook-replacer] failed to stop watcher:', e.message);
    }
    watcherProc = null;
    watcherStarted = false;
  }
}

function processSpoolFile(filePath, outDir) {
  if (!fs.existsSync(filePath)) return;

  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const langDir = path.basename(path.dirname(filePath));

  const validDirs = [
    'nodejs', 'python', 'bash', 'typescript', 'go', 'rust', 'c', 'cpp', 'java', 'deno',
    'codesearch', 'recall', 'memorize', 'wait', 'sleep', 'status', 'close', 'browser', 'runner'
  ];

  if (!validDirs.includes(langDir)) return;

  const taskId = base;
  const jsonOut = path.join(outDir, `${taskId}.json`);
  if (fs.existsSync(jsonOut)) return;

  const procMarker = `${filePath}.processing`;
  if (fs.existsSync(procMarker)) return;

  try {
    fs.writeFileSync(procMarker, String(process.pid));

    const bin = getToolsBin();
    if (!bin) {
      fs.writeFileSync(path.join(outDir, `${taskId}.json`), JSON.stringify({
        error: 'plugkit binary not available',
        exitCode: 1,
        timedOut: false
      }));
      return;
    }

    const r = spawnSync(bin, ['runner', '--dispatch', filePath, '--out', outDir], {
      cwd: path.dirname(filePath),
      encoding: 'utf8',
      timeout: 600000,
      windowsHide: true,
      stdio: 'pipe',
    });

    if (!fs.existsSync(jsonOut)) {
      const exitCode = r.status ?? 1;
      const metadata = {
        exitCode,
        timedOut: r.signal === 'SIGTERM',
        error: r.stderr || r.error?.message || 'unknown error',
        stdout: r.stdout || '',
      };
      fs.writeFileSync(jsonOut, JSON.stringify(metadata));
    }
  } catch (e) {
    const taskId = base;
    fs.writeFileSync(path.join(outDir, `${taskId}.json`), JSON.stringify({
      error: e.message,
      exitCode: 1,
      timedOut: false
    }));
  } finally {
    try { fs.unlinkSync(procMarker); } catch {}
  }
}

function runHookViaWatcher(subcommand, options = {}) {
  const cwd = options.cwd || process.cwd();
  
  ensurePlugkitBinary();
  
  if (!watcherStarted) {
    startSpoolWatcher(cwd, { stdio: 'pipe' });
  }

  const bin = getToolsBin();
  if (!bin) {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'plugkit binary not available',
      error: 'plugkit binary not available',
    };
  }

  const args = ['hook', subcommand];
  const result = spawnSync(bin, args, {
    cwd,
    encoding: 'utf8',
    timeout: options.timeoutMs || 30000,
    windowsHide: true,
    stdio: 'pipe',
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
  startSpoolWatcher,
  stopSpoolWatcher,
  runHookViaWatcher,
  processSpoolFile,
  ensurePlugkitBinary,
  getToolsBin,
  getSpoolDir,
};
