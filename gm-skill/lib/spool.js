const fs = require('fs');
const path = require('path');

function getSpoolBaseDir() {
  return path.join(process.cwd(), '.gm', 'exec-spool');
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
    nodejs: 'js', python: 'py', bash: 'sh', typescript: 'ts', go: 'go',
    rust: 'rs', c: 'c', cpp: 'cpp', java: 'java', deno: 'ts'
  };
  return langExt[lang] || 'js';
}

function validateVerb(verb) {
  const valid = ['codesearch', 'recall', 'memorize', 'wait', 'sleep', 'status', 'close', 'browser', 'runner', 'type', 'kill-port', 'forget', 'feedback', 'learn-status', 'learn-debug', 'learn-build', 'discipline', 'pause', 'health'];
  return valid.includes(verb) ? verb : 'status';
}

function writeSpool(body, lang = 'nodejs', options = {}) {
  const validLang = validateLang(lang);
  const taskId = options.taskId || generateTaskId();
  const inDir = path.join(getSpoolBaseDir(), 'in', validLang);
  const inFile = path.join(inDir, `${taskId}.${getExtForLang(validLang)}`);

  fs.mkdirSync(inDir, { recursive: true });

  const sessionId = options.sessionId || process.env.CLAUDE_SESSION_ID;
  const code = sessionId ? `const SESSION_ID = '${sessionId}';\n${body}` : body;
  fs.writeFileSync(inFile, code, 'utf8');

  return { id: taskId, path: inFile, lang: validLang, ext: getExtForLang(validLang) };
}

function writeSpoolVerb(body, verb, options = {}) {
  const validVerb = validateVerb(verb);
  const taskId = options.taskId || generateTaskId();
  const inDir = path.join(getSpoolBaseDir(), 'in', validVerb);
  const inFile = path.join(inDir, `${taskId}.txt`);

  fs.mkdirSync(inDir, { recursive: true });
  fs.writeFileSync(inFile, body, 'utf8');
  return { id: taskId, path: inFile, verb: validVerb };
}

function readSpoolOutput(id) {
  const outDir = path.join(getSpoolBaseDir(), 'out');
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
    id, stdout, stderr, metadata,
    exitCode: metadata.exitCode,
    durationMs: metadata.durationMs,
    timedOut: metadata.timedOut || false
  };
}

async function waitForCompletion(id, timeoutMs = 30000) {
  const jsonFile = path.join(getSpoolBaseDir(), 'out', `${id}.json`);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(jsonFile)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        const output = readSpoolOutput(id);
        return { ok: metadata.exitCode === 0 && !metadata.timedOut, ...output };
      } catch (e) {
        await new Promise(r => setTimeout(r, 50));
      }
    } else {
      await new Promise(r => setTimeout(r, 50));
    }
  }

  const output = readSpoolOutput(id);
  return { ok: false, ...output, timedOut: true, stderr: output.stderr + `\n[timeout ${timeoutMs}ms]` };
}

async function execSpool(body, lang, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const sessionId = options.sessionId || process.env.CLAUDE_SESSION_ID;
  const task = lang === 'nodejs' || lang === 'bash' ? writeSpool(body, lang, { sessionId }) : writeSpoolVerb(body, lang, {});
  const result = await waitForCompletion(task.id, timeoutMs);
  if (options.cleanup !== false) {
    try { fs.unlinkSync(task.path); } catch (e) {}
  }
  return result;
}

async function execNodejs(body, options = {}) {
  return execSpool(body, 'nodejs', options);
}

async function execBash(body, options = {}) {
  return execSpool(body, 'bash', options);
}

async function execCodesearch(query, options = {}) {
  return execSpool(query, 'codesearch', options);
}

async function execRecall(query, options = {}) {
  return execSpool(query, 'recall', options);
}

async function execMemorize(fact, options = {}) {
  return execSpool(fact, 'memorize', options);
}

function getAllOutputs() {
  const outDir = path.join(getSpoolBaseDir(), 'out');
  if (!fs.existsSync(outDir)) return [];

  const files = fs.readdirSync(outDir);
  const taskIds = new Set();
  files.forEach(file => {
    const match = file.match(/^(.+?)\.(out|err|json)$/);
    if (match) taskIds.add(match[1]);
  });
  return Array.from(taskIds).map(id => readSpoolOutput(id));
}

function cleanupTempFiles(taskId) {
  const outDir = path.join(getSpoolBaseDir(), 'out');
  ['.out', '.err', '.json'].forEach(ext => {
    try {
      const file = path.join(outDir, `${taskId}${ext}`);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (e) {}
  });
}

module.exports = {
  writeSpool, writeSpoolVerb, readSpoolOutput, waitForCompletion,
  execNodejs, execBash, execCodesearch, execRecall, execMemorize,
  getAllOutputs, cleanupTempFiles, getSpoolBaseDir, generateTaskId,
  validateLang, getExtForLang, validateVerb
};
