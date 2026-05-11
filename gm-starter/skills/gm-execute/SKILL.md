---
name: gm-execute
description: EXECUTE phase AND the foundational execution contract for every skill. Every exec:<lang> run, every witnessed check, every code search, in every phase, follows this skill's discipline. Resolve all mutables via witnessed execution. Any new unknown triggers immediate snake back to planning — restart chain from PLAN.
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

Every witness that resolves a mutable writes back to `.gm/mutables.yml` the same step: set `status: witnessed` and fill `witness_evidence` with concrete proof (file:line, codesearch hit, exec output snippet). No write-back = the mutable stays unknown and the EMIT-gate stays closed. The hook reads this file; the agent's memory of "I resolved it" does not unblock anything.

Route candidates from PLAN are `weak_prior` only. Plausibility is the right to test, not the right to believe. A claim with no witness in the current session is a hypothesis — say so when stating it, and say what would settle it. The next reader (you, next turn) needs to know which lines were earned and which were carried forward.

## Verification budget

Spend on `.prd` items in descending order of consequence-if-wrong × distance-from-witnessed. Items whose failure would collapse the headline finding must reach witnessed status before EMIT; sub-argument-level items need at minimum a stated fallback path.

## Code execution

Code AND utility verbs both run through the file-spool. Write a file to `.gm/exec-spool/in/<lang-or-verb>/<N>.<ext>` — language stems (`in/nodejs/42.js`, `in/python/43.py`, `in/bash/44.sh`, plus typescript, go, rust, c, cpp, java, deno) or verb stems (`in/codesearch/45.txt`, `in/recall/46.txt`, `in/memorize/47.md`, plus wait, sleep, status, close, browser, runner, type, kill-port, forget, feedback, learn-status, learn-debug, learn-build, discipline, pause, health). The spool watcher executes and streams stdout to `out/<N>.out`, stderr to `out/<N>.err`, then writes `out/<N>.json` metadata sidecar at completion (taskId, lang, ok, exitCode, durationMs, timedOut, startedAt, endedAt). Both streams return as systemMessage with `--- stdout ---` / `--- stderr ---` separators. File I/O via a nodejs spool file + `require('fs')`. Only `git` and `gh` run directly in Bash. Never `Bash(node/npm/npx/bun)`, never `Bash(exec:<anything>)`.

Pack runs: `Promise.allSettled`, each idea own try/catch, under 12s per call. Runner: write `in/runner/<N>.txt` with body `start` | `stop` | `status`.

Every exec daemonizes. The hook tails the task logfile up to 30s wall-clock and returns whatever is there — short tasks complete inside the window and look synchronous; long tasks return a task_id with partial output. Continue with `exec:tail` (drain, bounded), `exec:watch` (resume blocking until match or timeout), or `exec:close` (terminate). Never re-spawn a long task to check on it — that orphans the first one. `exec:wait` is a pure timer; `exec:sleep` blocks on a specific task's output; `exec:watch` is the match-or-timeout primitive. Every execution-platform RPC returns the live list of running tasks for this session — close stragglers via `exec:close\n<id>` so the list stays scannable. Session-end (clear/logout/prompt_input_exit) kills the session's tasks; compaction/handoff preserves them.

Every utility verb dispatches via `in/<verb>/<N>.txt`; the body of the file is the verb's argument. There is no inline form and no Bash-prefix form — both are denied by the hook.

## Codebase search

`exec:codesearch` only. Grep, Glob, Find, Explore, raw grep/rg/find inside `exec:bash` are all hook-blocked.

```
exec:codesearch
<two-word query>
```

Start two words, change/add one per pass, minimum four attempts before concluding absent. Known absolute path → `Read`. Known directory → `exec:nodejs` + `fs.readdirSync`.

## Import-based execution

Hypotheses become real by importing actual modules from disk. Reimplemented behavior is UNKNOWN. Write the import probe to the spool:

```
# write .gm/exec-spool/in/nodejs/42.js
const { fn } = await import('/abs/path/to/module.js');
console.log(await fn(realInput));
```

Differential diagnosis: smallest reproduction → compare actual vs expected → name the delta — that delta is the mutable.

## Edits depend on witnesses

Hypothesis → run → witness → edit. An edit before a witness is a guess. Scan via `exec:codesearch` before creating or modifying — duplicate concern regresses to `planning`. Code-quality preference: native → library → structure → write.

## Parallel subagents

Up to 3 `gm:gm` subagents for independent items in one message. Browser escalation: `exec:browser` → `browser` skill → screenshot only as last resort.

## CI is automated

`git push` triggers the Stop hook to watch Actions for the pushed HEAD on the same repo (downstream cascades are not auto-watched). Green → Stop approves with summary; failure → run names + IDs surfaced, investigate via `gh run view <id> --log-failed`. Deadline 180s (override `GM_CI_WATCH_SECS`).
