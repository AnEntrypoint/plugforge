---
name: create-lang-plugin
description: Create a lang/ plugin that wires any CLI tool or language runtime into gm-cc — adds exec:<id> dispatch, optional LSP diagnostics, and optional prompt context injection. Zero hook configuration required.
---

# Create lang plugin

Single CommonJS file at `<projectDir>/lang/<id>.js`. Auto-discovered — no hook editing.

## Plugin shape

```js
'use strict';
module.exports = {
  id: 'mytool',
  exec: {
    match: /^exec:mytool/,
    run(code, cwd) { /* returns string or Promise<string> */ }
  },
  lsp: {
    check(fileContent, cwd) { /* returns Diagnostic[] */ }
  },
  extensions: ['.ext'],
  context: `=== mytool ===\n...`
};
```

`type Diagnostic = { line: number; col: number; severity: 'error'|'warning'; message: string }`

`exec.run` runs in a child process, 30s timeout, async OK. Called when Claude writes `exec:mytool\n<code>`. `lsp.check` is synchronous-only, called per prompt-submit. `context` is injected into every prompt, truncated to 2000 chars.

## Identify the tool

What is the CLI name or npm package? Does it run a single expression (`tool eval`, `tool -e`, HTTP POST) or a file (`tool run <file>`)? What is its lint/check mode and output format? File extensions? Does it require a running server, or does it run headless?

## exec.run patterns

HTTP eval against a running server:

```js
function httpPost(port, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      res => { let raw = ''; res.on('data', c => raw += c); res.on('end', () => resolve(JSON.parse(raw))); }
    );
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.write(data); req.end();
  });
}
```

File-based, headless:

```js
function runFile(code, cwd) {
  const tmp = path.join(os.tmpdir(), `plugin_${Date.now()}.ext`);
  fs.writeFileSync(tmp, code);
  try { return execFileSync('mytool', ['run', tmp], { cwd, encoding: 'utf8', timeout: 10000 }); }
  finally { try { fs.unlinkSync(tmp); } catch (_) {} }
}
```

Single-expression detection:

```js
const isSingleExpr = code => !code.trim().includes('\n') && !/\b(func|def|fn |class|import)\b/.test(code);
```

## lsp.check

```js
function check(fileContent, cwd) {
  const tmp = path.join(os.tmpdir(), `lsp_${Math.random().toString(36).slice(2)}.ext`);
  try {
    fs.writeFileSync(tmp, fileContent);
    const r = spawnSync('mytool', ['check', tmp], { encoding: 'utf8', cwd });
    return (r.stdout + r.stderr).split('\n').reduce((acc, line) => {
      const m = line.match(/^.+:(\d+):(\d+):\s+(error|warning):\s+(.+)$/);
      if (m) acc.push({ line: +m[1], col: +m[2], severity: m[3], message: m[4].trim() });
      return acc;
    }, []);
  } catch (_) { return []; }
  finally { try { fs.unlinkSync(tmp); } catch (_) {} }
}
```

## context

Under 300 chars:

```js
context: `=== mytool ===\nexec:mytool\n<expression>\n\nRuns via <how>. Use for <when>.`
```

## Verify

```
exec:nodejs
const p = require('/abs/path/lang/mytool.js');
console.log(p.id, typeof p.exec.run, p.exec.match.toString());
```

Then test dispatch:

```
exec:mytool
<simple test expression>
```

## Constraints

- `exec.run` async OK, 30s timeout
- `lsp.check` synchronous only — no Promises
- CommonJS only — no ES module syntax
- No persistent processes
- `id` must match filename exactly
- First match wins — keep `match` specific
