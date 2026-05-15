---
name: gm-execute
description: EXECUTE phase AND the foundational execution contract for every skill. Every spool dispatch run, every witnessed check, every code search, in every phase, follows this skill's discipline. Resolve all mutables via witnessed execution. Any new unknown triggers immediate snake back to planning — restart chain from PLAN.
---

# GM EXECUTE — Resolve every unknown by witness

Entry: `.prd` with named unknowns. Exit: every mutable KNOWN → invoke `gm-emit`.

A `@<discipline>` sigil propagates from PLAN through every recall, codesearch, and memorize call; reads without one fan across default plus enabled disciplines, writes without one go to default only.

This skill is the execution contract for ALL phases — pre-emit witnesses, post-emit verifies, e2e checks all run on this discipline. Cross-cutting dispositions live in `gm` SKILL.md.

## Transitions

- All mutables KNOWN → `gm-emit`
- Still UNKNOWN → re-run from a different angle (max 2 passes)
- New unknown OR unresolvable after 2 passes → `planning`

## Mutable discipline

Each mutable carries: name, expected, current, resolution method.

Resolves to KNOWN only when all four pass:

- **ΔS = 0** — witnessed output equals expected
- **λ ≥ 2** — two independent paths agree
- **ε intact** — adjacent invariants hold
- **Coverage ≥ 0.70** — enough corpus inspected to rule out contradiction

Unresolved after 2 passes regresses to `planning`. Never narrate past an unresolved mutable.

Every witness that resolves a mutable writes back to `.gm/mutables.yml` the same step: set `status: witnessed` and fill `witness_evidence` with concrete proof (file:line, codesearch hit, dispatched test output). No write-back = the mutable stays unknown and the EMIT-gate stays closed. The hook reads this file; the agent's memory of "I resolved it" does not unblock anything.

Route candidates from PLAN are `weak_prior` only. Plausibility is the right to test, not the right to believe. A claim with no witness in the current session is a hypothesis — say so when stating it, and say what would settle it. The next reader (you, next turn) needs to know which lines were earned and which were carried forward.

## Verification budget

Spend on `.prd` items in descending order of consequence-if-wrong × distance-from-witnessed. Items whose failure would collapse the headline finding must reach witnessed status before EMIT; sub-argument-level items need at minimum a stated fallback path.

## Spool-Only Execution (No exec: Prefix)

Without hook infrastructure, all execution goes through file spooling. There is no `exec:` prefix form — write spool files directly:

**Language execution**: write code to `.gm/exec-spool/in/<lang>/<N>.<ext>`:
- `in/nodejs/<N>.js` — JavaScript/Node.js
- `in/python/<N>.py` — Python
- `in/bash/<N>.sh` — Bash shell
- `in/typescript/<N>.ts` — TypeScript
- `in/go/<N>.go` — Go
- `in/rust/<N>.rs` — Rust
- `in/c/<N>.c` — C
- `in/cpp/<N>.cpp` — C++
- `in/java/<N>.java` — Java
- `in/deno/<N>.ts` — Deno TypeScript

**Utility verbs**: write argument to `.gm/exec-spool/in/<verb>/<N>.txt`:
- `in/codesearch/<N>.txt` — codebase search query
- `in/recall/<N>.txt` — memory recall query
- `in/memorize/<N>.txt` — fact to memorize
- `in/wait/<N>.txt` — wait timer (ms)
- `in/sleep/<N>.txt` — sleep for task output
- `in/status/<N>.txt` — task status check
- `in/close/<N>.txt` — close task by ID
- `in/browser/<N>.txt` — browser command
- `in/runner/<N>.txt` — runner control (start|stop|status)
- `in/health/<N>.txt` — health probe (empty body)

**Reading results**: after spool watcher processes the file:
- `out/<N>.out` — stdout
- `out/<N>.err` — stderr
- `out/<N>.json` — metadata `{exitCode, durationMs, timedOut, startedAt, endedAt}`

Poll `out/<N>.json` for completion. Both streams return as systemMessage with `--- stdout ---` / `--- stderr ---` separators.

**File I/O**: use nodejs spool file + `require('fs')`. Only `git` and `gh` run directly via Bash. Never `Bash(node/npm/npx/bun)`.

**Pack runs**: `Promise.allSettled`, each idea own try/catch, under 12s per call. Runner: write `in/runner/<N>.txt` with body `start` | `stop` | `status`.

**Every exec daemonizes**: the spool watcher executes and streams results. Short tasks complete inside the poll window and look synchronous; long tasks return partial output. Continue with `in/status/<N>.txt` (drain, bounded), `in/watch/<N>.txt` (resume blocking until match or timeout), or `in/close/<N>.txt` (terminate). Never re-spawn a long task to check on it — that orphans the first one. Session-end (clear/logout/prompt_input_exit) kills the session's tasks; compaction/handoff preserves them.

## Turn-State Tracking (Skills-Only Platforms)

After each tool use, update `.gm/turn-state.json`:

```json
{"phase":"EXECUTE","toolCount":<N>,"timestamp":"<ISO8601>","sessionId":"<id>"}
```

Write via nodejs spool file:
```js
const fs = require('fs');
const path = require('path');
const statePath = path.join(process.cwd(), '.gm', 'turn-state.json');
const state = { phase: 'EXECUTE', toolCount: N, timestamp: new Date().toISOString(), sessionId: process.env.CLAUDE_SESSION_ID || 'unknown' };
fs.writeFileSync(statePath, JSON.stringify(state));
```

## Codebase search

Codesearch only. Grep, Glob, Find, Explore, raw grep/rg/find inside Bash are all hook-blocked.

Write query to `.gm/exec-spool/in/codesearch/<N>.txt`. Read result from `.gm/exec-spool/out/<N>.out`.

Start two words, change/add one per pass, minimum four attempts before concluding absent. Known absolute path → `Read`. Known directory → nodejs spool file + `fs.readdirSync`.

## Utility verb failure handling

**Utility verb failures must surface**: memorize, recall, codesearch, and other utility verbs may fail (socket unavailable, timeout, network error). Failures do not block witness completion but must be reported to the user with error context. Fallback mechanisms (AGENTS.md for memorize) ensure memory preservation even when rs-learn is temporarily unavailable.

## Import-based execution

Hypotheses become real by importing actual modules from disk. Reimplemented behavior is UNKNOWN. Write the import probe to the spool:

```
# write .gm/exec-spool/in/nodejs/42.js
const { fn } = await import('/abs/path/to/module.js');
console.log(await fn(realInput));
```

Differential diagnosis: smallest reproduction → compare actual vs expected → name the delta — that delta is the mutable.

## Edits depend on witnesses

Hypothesis → run → witness → edit. An edit before a witness is a guess. Scan via codesearch before creating or modifying — duplicate concern regresses to `planning`. Code-quality preference: native → library → structure → write.

## Parallel subagents

Up to 3 `gm:gm` subagents for independent items in one message. Browser escalation: browser skill → screenshot only as last resort.

## CI is automated

`git push` triggers the Stop hook to watch Actions for the pushed HEAD on the same repo (downstream cascades are not auto-watched). Green → Stop approves with summary; failure → run names + IDs surfaced, investigate via `gh run view <id> --log-failed`. Deadline 180s (override `GM_CI_WATCH_SECS`).
