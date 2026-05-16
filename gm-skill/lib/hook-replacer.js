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
        watcherProc = spawn(bin, ['spool'], {
          detached: true,
          stdio: options.stdio || 'ignore',
          windowsHide: true,
          cwd: cwd || process.cwd(),
          env: {
            ...process.env,
            SESSION_ID: process.env.SESSION_ID || process.env.CLAUDE_SESSION_ID || 'default',
            CLAUDE_PROJECT_DIR: cwd || process.cwd(),
            SPOOL_DIR: path.join(cwd || process.cwd(), '.gm', 'exec-spool')
          }
        });
        watcherProc.unref();
        watcherStarted = true;
        return watcherProc.pid;
      } catch (e) {
        console.error('[hook-replacer] plugkit spool failed:', e.message);
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

  let tmpFile = null;
  try {
    fs.writeFileSync(procMarker, String(process.pid));

    const bin = getToolsBin();
    if (!fs.existsSync(bin)) {
      fs.writeFileSync(jsonOut, JSON.stringify({
        error: 'plugkit binary not available',
        exitCode: 1,
        timedOut: false
      }));
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const sessionId = process.env.SESSION_ID || process.env.CLAUDE_SESSION_ID || process.env.GM_SESSION_ID || 'default';
    
    let result;
    if (['nodejs', 'typescript'].includes(langDir)) {
      tmpFile = path.join(os.tmpdir(), `spool-${taskId}.js`);
      fs.writeFileSync(tmpFile, content);
      result = spawnSync(bin, ['exec', '--lang', 'nodejs', '--session', sessionId, '--timeout-ms', '300000', '--file', tmpFile], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 600000,
        windowsHide: true,
        stdio: 'pipe',
      });
    } else if (langDir === 'bash') {
      const shellRuntime = process.platform === 'win32' ? 'powershell' : 'bash';
      result = spawnSync(bin, ['exec', '--lang', shellRuntime, '--session', sessionId, '--timeout-ms', '300000', content], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 600000,
        windowsHide: true,
        stdio: 'pipe',
        env: { ...process.env, SESSION_ID: sessionId }
      });
    } else if (langDir === 'python') {
      tmpFile = path.join(os.tmpdir(), `spool-${taskId}.py`);
      fs.writeFileSync(tmpFile, content);
      result = spawnSync(bin, ['exec', '--lang', 'python', '--session', sessionId, '--timeout-ms', '300000', '--file', tmpFile], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 600000,
        windowsHide: true,
        stdio: 'pipe',
      });
    } else if (langDir === 'codesearch') {
      result = spawnSync(bin, ['search', content], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 600000,
        windowsHide: true,
        stdio: 'pipe',
      });
    } else if (langDir === 'recall') {
      result = spawnSync(bin, ['recall', content], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 600000,
        windowsHide: true,
        stdio: 'pipe',
      });
    } else if (langDir === 'memorize') {
      result = spawnSync(bin, ['memorize', content], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 600000,
        windowsHide: true,
        stdio: 'pipe',
      });
    } else {
      fs.writeFileSync(jsonOut, JSON.stringify({
        error: `Unknown lang/verb: ${langDir}`,
        exitCode: 1,
        timedOut: false
      }));
      return;
    }

    if (!fs.existsSync(jsonOut)) {
      const exitCode = result.status ?? 1;
      const metadata = {
        exitCode,
        timedOut: result.signal === 'SIGTERM',
        error: result.stderr || result.error?.message || '',
        stdout: result.stdout || '',
      };
      fs.writeFileSync(jsonOut, JSON.stringify(metadata));
    }
  } catch (e) {
    fs.writeFileSync(path.join(outDir, `${taskId}.json`), JSON.stringify({
      error: e.message,
      exitCode: 1,
      timedOut: false
    }));
  } finally {
    try { fs.unlinkSync(procMarker); } catch {}
    if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch {} }
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
