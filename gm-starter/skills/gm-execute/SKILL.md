---
name: gm-execute
description: EXECUTE phase AND the foundational execution contract for every skill. Every exec:<lang> run, every witnessed check, every code search, in every phase, follows this skill's discipline. Resolve all mutables via witnessed execution. Any new unknown triggers immediate snake back to planning — restart chain from PLAN.
---

# GM EXECUTE — Resolve every unknown by witness

Entry: `.prd` with named unknowns. Exit: every mutable KNOWN → invoke `gm-emit`.

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

Route candidates from PLAN are `weak_prior` only. Plausibility is the right to test, not the right to believe. A claim with no witness in the current session is a hypothesis — say so when stating it, and say what would settle it. The next reader (you, next turn) needs to know which lines were earned and which were carried forward.

## Verification budget

Spend on `.prd` items in descending order of consequence-if-wrong × distance-from-witnessed. Items whose failure would collapse the headline finding must reach witnessed status before EMIT; sub-argument-level items need at minimum a stated fallback path.

## Code execution

`exec:<lang>` only via Bash. Languages: nodejs (default), bash, python, typescript, go, rust, c, cpp, java, deno, cmd. File I/O via `exec:nodejs` + `require('fs')`. Git directly in Bash. Never `Bash(node/npm/npx/bun)`.

Pack runs: `Promise.allSettled`, each idea own try/catch, under 12s per call. Runner: `exec:runner\n{start|stop|status}`.

Every exec daemonizes. The hook tails the task logfile up to 30s wall-clock and returns whatever is there — short tasks complete inside the window and look synchronous; long tasks return a task_id with partial output. Continue with `exec:tail` (drain, bounded), `exec:watch` (resume blocking until match or timeout), or `exec:close` (terminate). Never re-spawn a long task to check on it — that orphans the first one. `exec:wait` is a pure timer; `exec:sleep` blocks on a specific task's output; `exec:watch` is the match-or-timeout primitive. Every execution-platform RPC returns the live list of running tasks for this session — close stragglers via `exec:close\n<id>` so the list stays scannable. Session-end (clear/logout/prompt_input_exit) kills the session's tasks; compaction/handoff preserves them.

Utility verbs (`exec:wait`, `exec:sleep`, `exec:status`, `exec:close`, `exec:pause`, `exec:type`, `exec:runner`, `exec:kill-port`, `exec:recall`, `exec:memorize`, `exec:forget`) take their argument on the next line. Inline form (`exec:status <id>`) is denied by the hook.

## Codebase search

`exec:codesearch` only. Grep, Glob, Find, Explore, raw grep/rg/find inside `exec:bash` are all hook-blocked.

```
exec:codesearch
<two-word query>
```

Start two words, change/add one per pass, minimum four attempts before concluding absent. Known absolute path → `Read`. Known directory → `exec:nodejs` + `fs.readdirSync`.

## Import-based execution

Hypotheses become real by importing actual modules from disk. Reimplemented behavior is UNKNOWN.

```
exec:nodejs
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
