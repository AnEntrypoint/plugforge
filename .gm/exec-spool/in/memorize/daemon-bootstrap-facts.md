# daemon-bootstrap.js Implementation for gm-skill

## Location
`C:\dev\gm\gm-skill\lib\daemon-bootstrap.js` — standalone, no plugkit hooks

## Exported Functions (5)
1. `checkState(daemonName)` — returns {ok, running, durationMs}
2. `spawn(daemonName, cmd)` — returns {ok, pid/error, durationMs}
3. `waitForReady(daemonName, host, port, timeoutMs=30000)` — returns {ok, host, port, elapsedMs} or {ok:false, error, elapsedMs}
4. `getSocket(daemonName)` — returns {ok, socket, ...status} or {ok:false, error}
5. `shutdown(daemonName)` — returns {ok, killed, durationMs}

All are async functions accepting daemonName string parameter.

## Helper Functions
- `emitEvent(daemon, severity, message, details)` — writes to ~/.claude/gm-log/<date>/daemon.jsonl
- `isDaemonRunning(daemonName)` — returns boolean (tasklist on Windows, pgrep on Unix)
- `checkPortReachable(host, port, timeoutMs=500)` — returns Promise<boolean>

## Platform Detection
- Windows (win32): `tasklist /FO CSV /NH` parsing
- Unix (darwin/linux): `pgrep -f "name"` exit code check

## Logging & State
- Logs: ~/.claude/gm-log/<date>/daemon.jsonl (JSONL with ts, daemon, severity, message, details)
- Status: ~/.gm/<daemon>-status.json (JSON with daemon, status, sessionId, timestamp, pid, details)
- Session awareness via CLAUDE_SESSION_ID env var (fallback to 'unknown')

## Key Implementation Details
- Detached spawning via child_process.spawn(detached:true, stdio:'ignore', windowsHide:true)
- Socket polling via net.Socket with configurable timeout
- Graceful fallback on spawn/detection failures (returns error object, no throw)
- All file I/O wrapped in try/catch, prevents crashes

## Integration
- Imported via `require('./lib/daemon-bootstrap.js')` in gm-skill/index.js
- Exported via package.json exports: `"./daemon-bootstrap": "./lib/daemon-bootstrap.js"`
- Accessible via `require('gm-skill').checkState` etc. (spread exports)

## Use Cases in gm-skill
- Daemon health checks at session start
- Graceful degradation if daemon spawn fails
- Port readiness polling (acptoapi@4800, rs-learn, rs-codeinsight)
- Session-scoped daemon lifecycle tracking
