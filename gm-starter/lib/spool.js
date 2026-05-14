const fs = require('fs');
const path = require('path');
const os = require('os');

function getSpoolBaseDir() {
  const cwd = process.cwd();
  return path.join(cwd, '.gm', 'exec-spool');
}

function generateTaskId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function validateLang(lang) {
  const valid = ['nodejs', 'python', 'bash', 'typescript', 'go', 'rust', 'c', 'cpp', 'java', 'deno'];
  return valid.includes(lang) ? lang : 'nodejs';
}

function getExtForLang(lang) {
  const langExt = {
    nodejs: 'js',
    python: 'py',
    bash: 'sh',
    typescript: 'ts',
    go: 'go',
    rust: 'rs',
    c: 'c',
    cpp: 'cpp',
    java: 'java',
    deno: 'ts'
  };
  return langExt[lang] || 'js';
}

function writeSpool(body, lang = 'nodejs', options = {}) {
  const validLang = validateLang(lang);
  const ext = getExtForLang(validLang);
  const taskId = options.taskId || generateTaskId();

  const baseDir = getSpoolBaseDir();
  const inDir = path.join(baseDir, 'in', validLang);
  const inFile = path.join(inDir, `${taskId}.${ext}`);

  fs.mkdirSync(inDir, { recursive: true });

  const sessionId = options.sessionId || process.env.CLAUDE_SESSION_ID;
  const code = sessionId ? `const SESSION_ID = '${sessionId}';\n${body}` : body;

  fs.writeFileSync(inFile, code, 'utf8');

  return {
    id: taskId,
    path: inFile,
    lang: validLang,
    ext
  };
}

function readSpoolOutput(id) {
  const baseDir = getSpoolBaseDir();
  const outDir = path.join(baseDir, 'out');

  const outFile = path.join(outDir, `${id}.out`);
  const errFile = path.join(outDir, `${id}.err`);
  const jsonFile = path.join(outDir, `${id}.json`);

  const stdout = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  const stderr = fs.existsSync(errFile) ? fs.readFileSync(errFile, 'utf8') : '';

  let metadata = {};
  if (fs.existsSync(jsonFile)) {
    try {
      metadata = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    } catch (e) {
      metadata = { error: 'Failed to parse metadata' };
    }
  }

  return {
    id,
    stdout,
    stderr,
    metadata,
    exitCode: metadata.exitCode,
    durationMs: metadata.durationMs,
    timedOut: metadata.timedOut || false
  };
}

async function waitForCompletion(id, timeoutMs = 30000) {
  const baseDir = getSpoolBaseDir();
  const outDir = path.join(baseDir, 'out');
  const jsonFile = path.join(outDir, `${id}.json`);

  const start = Date.now();
  const interval = 50;

  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(jsonFile)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        const output = readSpoolOutput(id);
        return {
          ok: metadata.exitCode === 0 && !metadata.timedOut,
          ...output
        };
      } catch (e) {
        await new Promise(r => setTimeout(r, interval));
      }
    } else {
      await new Promise(r => setTimeout(r, interval));
    }
  }

  const output = readSpoolOutput(id);
  return {
    ok: false,
    ...output,
    timedOut: true,
    stderr: output.stderr + `\n[spool timeout after ${timeoutMs}ms]`
  };
}

function getAllOutputs() {
  const baseDir = getSpoolBaseDir();
  const outDir = path.join(baseDir, 'out');

  if (!fs.existsSync(outDir)) {
    return [];
  }

  const files = fs.readdirSync(outDir);
  const taskIds = new Set();

  files.forEach(file => {
    const match = file.match(/^(.+?)\.(out|err|json)$/);
    if (match) {
      taskIds.add(match[1]);
    }
  });

  return Array.from(taskIds).map(id => readSpoolOutput(id));
}

module.exports = {
  writeSpool,
  readSpoolOutput,
  waitForCompletion,
  getAllOutputs,
  getSpoolBaseDir,
  generateTaskId,
  validateLang,
  getExtForLang
};
