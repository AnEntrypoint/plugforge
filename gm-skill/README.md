# gm-skill

Unified skill library for gm platform implementations.

## Installation

```bash
npm install gm-skill
```

## Usage

### Daemon Bootstrap Functions

```javascript
const {
  ensureRsLearningDaemonRunning,
  ensureRsCodeinsightDaemonRunning,
  ensureRsSearchDaemonRunning,
  ensureAcptoapiRunning,
  checkPortReachable
} = require('gm-skill');
```

#### Functions

- `ensureRsLearningDaemonRunning()` - Ensures rs-learn daemon is running
- `ensureRsCodeinsightDaemonRunning()` - Ensures rs-codeinsight daemon is running
- `ensureRsSearchDaemonRunning()` - Ensures rs-search daemon is running
- `ensureAcptoapiRunning()` - Ensures acptoapi daemon is running
- `checkPortReachable(host, port, timeoutMs)` - Check if a port is reachable

All functions are async and return an object with `ok` and additional metadata.

### Spool Dispatch Helpers

```javascript
const { spool } = require('gm-skill');
const { writeSpool, readSpoolOutput, waitForCompletion, getAllOutputs } = spool;
```

#### Functions

- `writeSpool(body, lang, options)` - Write code to spool input directory; returns `{ id, path, lang, ext }`
  - `body` (string) - Code to execute
  - `lang` (string, default: `'nodejs'`) - Language: nodejs, python, bash, typescript, go, rust, c, cpp, java, deno
  - `options` (object, optional) - `{ taskId, sessionId }`
- `readSpoolOutput(id)` - Read completed task output; returns `{ id, stdout, stderr, metadata, exitCode, durationMs, timedOut }`
- `waitForCompletion(id, timeoutMs)` - Poll for task completion; returns promise with `{ ok, ...output }`
- `getAllOutputs()` - Enumerate all completed tasks in spool directory; returns array of output objects

All paths are platform-aware (Windows and POSIX compatible).

#### Example

```javascript
const { spool } = require('gm-skill');

const result = spool.writeSpool('console.log("hello")', 'nodejs');
console.log(result.id);

const output = await spool.waitForCompletion(result.id, 30000);
console.log(output.stdout);
```
