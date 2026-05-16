const fs = require('fs');
const path = require('path');
const daemon = require('./daemon-bootstrap.js');
const manifest = require('./manifest.js');
const loader = require('./loader.js');
const prepareModule = require('./prepare.js');
const spool = require('./spool.js');
const learning = require('./learning.js');
const codeinsight = require('./codeinsight.js');
const browser = require('./browser.js');
const git = require('./git.js');
const hooks = require('./hook-bridge.js');
const hookReplacer = require('./hook-replacer.js');

// Auto-watcher module (file-based polling spool watcher)
let watcherInstance = null;

function startSpoolWatcher(cwd) {
  cwd = cwd || process.cwd();
  const inDir = path.join(cwd, '.gm', 'exec-spool', 'in');
  const outDir = path.join(cwd, '.gm', 'exec-spool', 'out');

  try {
    fs.mkdirSync(inDir, { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });
  } catch (e) {
    console.error('[spool-watcher] failed to create dirs:', e.message);
    return null;
  }

  // Try plugkit spool watcher first
  const binary = hooks.getPlugkitBinary();
  if (binary) {
    try {
      const { spawn } = require('child_process');
      const sessionId = process.env.SESSION_ID || process.env.CLAUDE_SESSION_ID || 'default';
      const proc = spawn(binary, ['spool'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        cwd,
        env: {
          ...process.env,
          SESSION_ID: sessionId,
          CLAUDE_PROJECT_DIR: cwd,
          SPOOL_DIR: path.join(cwd, '.gm', 'exec-spool')
        }
      });
      proc.unref();
      watcherInstance = proc;
      return proc.pid;
    } catch (e) {
      console.error('[spool-watcher] plugkit spool failed, falling back to poll:', e.message);
    }
  }

  // Fallback: poll-based watcher using fs.watch
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

    watcherInstance = watcher;
    return `poll:${inDir}`;
  } catch (e) {
    // chokidar not available, try native fs.watch
    try {
      const nativeWatcher = fs.watch(inDir, { recursive: false }, (eventType, filename) => {
        if (!filename) return;
        processSpoolFile(path.join(inDir, filename), outDir);
      });
      // Watch subdirectories
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
      watcherInstance = nativeWatcher;
      return `poll:${inDir}`;
    } catch (e) {
      console.error('[spool-watcher] native watch failed:', e.message);
      return null;
    }
  }
}

// Process a single spool input file
function processSpoolFile(filePath, outDir) {
  if (!fs.existsSync(filePath)) return;

  // Parse task info from path
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const langDir = path.basename(path.dirname(filePath));

  // Only process valid language and verb directories
  const validLangs = ['nodejs', 'python', 'bash', 'typescript', 'go', 'rust', 'c', 'cpp', 'java', 'deno'];
  const validVerbs = ['codesearch', 'recall', 'memorize', 'wait', 'sleep', 'status', 'close', 'browser', 'runner'];

  if (!validLangs.includes(langDir) && !validVerbs.includes(langDir)) return;

  // Check if output already exists (already processed)
  const taskId = base;
  const jsonOut = path.join(outDir, `${taskId}.json`);
  if (fs.existsSync(jsonOut)) return;

  // Read input and execute
  const code = fs.readFileSync(filePath, 'utf8');
  const sessionId = code.match(/const SESSION_ID = '([^']+)'/)?.[1] || 'unknown';

  // Mark as processing
  const procMarker = `${filePath}.processing`;
  if (fs.existsSync(procMarker)) return;

  try {
    fs.writeFileSync(procMarker, String(process.pid));

    // Execute via the hook-replacer which has proper session handling
    hookReplacer.processSpoolFile(filePath, outDir);
  } catch (e) {
    console.error('[spool-watcher] error processing:', e.message);
  } finally {
    try { fs.unlinkSync(procMarker); } catch {}
  }
}

function stopSpoolWatcher() {
  if (watcherInstance) {
    try {
      if (typeof watcherInstance.kill === 'function') {
        watcherInstance.kill();
      } else if (typeof watcherInstance.close === 'function') {
        watcherInstance.close();
      }
    } catch {}
    watcherInstance = null;
  }
}

function getSkills() {
  return manifest.getAllSkills();
}

function getSkill(name) {
  return manifest.getSkill(name);
}

function loadSkill(skillName, baseDir) {
  return loader.dynamicLoadSkill(skillName, baseDir);
}

function bootstrapDaemon(daemonName, cmd) {
  return daemon.spawnDaemon(daemonName, cmd);
}

function ensurePlugkit() {
  return daemon.ensurePlugkitReady();
}

module.exports = {
  getSkills,
  getSkill,
  loadSkill,
  bootstrapDaemon,
  checkState: daemon.checkState,
  waitForReady: daemon.waitForReady,
  getSocket: daemon.getSocket,
  shutdown: daemon.shutdown,
  emitEvent: daemon.emitEvent,
  isDaemonRunning: daemon.isDaemonRunning,
  checkPortReachable: daemon.checkPortReachable,
  manifest: manifest,
  loader: loader,
  prepare: prepareModule.prepare,
  spool: spool,
  learning: learning,
  codeinsight: codeinsight,
  browser: browser,
  git: git,
  hooks: hooks,
  hookReplacer: hookReplacer,
  startSpoolWatcher,
  stopSpoolWatcher,
  ensurePlugkit,
};