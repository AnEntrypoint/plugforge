const fs = require('fs');
const path = require('path');
const os = require('os');

async function dispatchSpool(cmd, lang, body, timeoutMs, sessionId) {
  const taskId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const langDir = lang.match(/^(nodejs|python|bash|typescript|go|rust|c|cpp|java|deno)$/) ? lang : 'nodejs';
  const ext = {
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
  }[langDir] || 'js';

  const inDir = path.join(process.cwd(), '.gm', 'exec-spool', 'in', langDir);
  const outDir = path.join(process.cwd(), '.gm', 'exec-spool', 'out');
  const inFile = path.join(inDir, `${taskId}.${ext}`);
  const jsonFile = path.join(outDir, `${taskId}.json`);

  fs.mkdirSync(inDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const code = sessionId ? `const SESSION_ID = '${sessionId}';\n${body}` : body;
  fs.writeFileSync(inFile, code, 'utf8');

  return pollForCompletion(jsonFile, timeoutMs, taskId);
}

async function pollForCompletion(jsonFile, timeoutMs, taskId) {
  const start = Date.now();
  const interval = 50;

  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(jsonFile)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        const outFile = jsonFile.replace(/\.json$/, '.out');
        const errFile = jsonFile.replace(/\.json$/, '.err');
        const stdout = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
        const stderr = fs.existsSync(errFile) ? fs.readFileSync(errFile, 'utf8') : '';
        return {
          ok: metadata.exitCode === 0 && !metadata.timedOut,
          exitCode: metadata.exitCode,
          stdout,
          stderr,
          durationMs: metadata.durationMs,
          taskId,
          timedOut: metadata.timedOut || false
        };
      } catch (e) {
        await new Promise(r => setTimeout(r, interval));
      }
    } else {
      await new Promise(r => setTimeout(r, interval));
    }
  }

  return {
    ok: false,
    exitCode: -1,
    stdout: '',
    stderr: `[spool dispatch timeout after ${timeoutMs}ms]`,
    durationMs: Date.now() - start,
    taskId,
    timedOut: true
  };
}

module.exports = { dispatchSpool };
