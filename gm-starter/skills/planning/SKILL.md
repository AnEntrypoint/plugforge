---
name: planning
description: State machine orchestrator. Mutable discovery, PRD construction, and full PLAN→EXECUTE→EMIT→VERIFY→COMPLETE lifecycle. Invoke at session start and on any new unknown.
allowed-tools: Skill
---

# Planning — PLAN phase

Translate the request into `.gm/prd.yml` and hand to `gm-execute`. Re-enter on any new unknown in any phase.

A `@<discipline>` sigil in the request scopes recall, codesearch, and memorize calls during PLAN to that discipline's store. Without one, retrievals fan across default plus enabled disciplines and writes land in default only.

Cross-cutting dispositions (autonomy, fix-on-sight, nothing-fake, browser-witness, scope, recall, memorize) live in `gm` SKILL.md; this skill only carries what is unique to PLAN.

## Transitions

- PLAN done → `gm-execute`
- New unknown anywhere in chain → re-enter PLAN
- EXECUTE unresolvable after 2 passes → PLAN
- VERIFY: `.prd` empty + git clean + pushed → `update-docs`; else → `gm-execute`

Cannot stop while `.gm/prd.yml` has items, git is dirty, or commits are unpushed.

## Session start: restart spool watcher

Before any orient or PRD work, ensure the spool watcher is running. Check `.gm/exec-spool/.watcher.heartbeat` — if older than 30s, the watcher is dead. Restart it:

```
# write .gm/exec-spool/in/nodejs/restart-watcher.js
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const bin = path.join(os.homedir(), '.claude', 'gm-tools', 'plugkit.wasm');
const root = process.cwd();
const spoolIn = path.join(root, '.gm', 'exec-spool', 'in');
const spoolOut = path.join(root, '.gm', 'exec-spool', 'out');
const pidFile = path.join(os.tmpdir(), 'gm-plugkit-spool.pid');
if (fs.existsSync(pidFile)) {
  const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
  if (Number.isFinite(pid)) { try { process.kill(pid); } catch (_) {} }
  try { fs.unlinkSync(pidFile); } catch (_) {}
}
if (process.platform === 'win32') {
  try { spawnSync('taskkill', ['/F', '/IM', 'node.exe'], { windowsHide: true, timeout: 3000, stdio: 'ignore' }); } catch (_) {}
} else {
  try { spawnSync('pkill', ['-f', 'plugkit'], { timeout: 3000, stdio: 'ignore' }); } catch (_) {}
}
fs.mkdirSync(spoolIn, { recursive: true });
fs.mkdirSync(spoolOut, { recursive: true });
const proc = spawn('node', [bin, 'runner', '--watch', spoolIn, '--out', spoolOut], {
  detached: true, stdio: 'ignore', windowsHide: true, cwd: root,
});
proc.unref();
fs.writeFileSync(pidFile, String(proc.pid));
```

Wait 2s for watcher to initialize, then proceed with orient.

## Orient

Open every plan with one parallel pack of recall + codesearch against the request's nouns. Write queries to `.gm/exec-spool/in/recall/<N>.txt` and `.gm/exec-spool/in/codesearch/<N>.txt`. Read results from `.gm/exec-spool/out/<N>.out`. Hits land as `weak_prior`; misses confirm the unknown is fresh. The pack runs in one message.

**Auto-recall injection (skills-only platforms)**: derive a 2–6 word query from the request's nouns (subject, verb objects, key domain terms). Write recall query to `.gm/exec-spool/in/recall/<N>.txt` at PLAN start before writing `.gm/prd.yml`. Read result from `.gm/exec-spool/out/<N>.out`. This replaces the prompt-submit hook's auto-recall for platforms without hook infrastructure. Recall hits are injected as context into mutable discovery and PRD item acceptance criteria.

## Mutable discovery

For each aspect of the work, ask: what do I not know, what could go wrong, what depends on what, what am I assuming. Unwitnessed assumptions are mutables.

Fault surfaces to scan: file existence, API shape, data format, dep versions, runtime behavior, env differences, error conditions, concurrency, integration seams, backwards compat, rollback paths, CI correctness.

Tag every item with a route family (grounding | reasoning | state | execution | observability | boundary | representation) and cross-reference the 16-failure taxonomy. `governance` skill holds the table.

`existingImpl=UNKNOWN` is the default; resolve via codesearch (write to `.gm/exec-spool/in/codesearch/<N>.txt`) before adding the item. An existing concern routes to consolidation, not addition.

Plan exits when zero new unknowns surfaced last pass AND every item has acceptance criteria AND deps are mapped.

## .gm/mutables.yml — co-equal with .gm/prd.yml

Every unknown surfaced during PLAN lands as an entry in `.gm/mutables.yml` the same pass. Live during work, deleted when empty. Self-enforced: never use Write/Edit/NotebookEdit, never run `git commit`/`git push`, never stop the turn while any entry has `status: unknown`. This discipline is owned by the agent — not by external infrastructure.

```yaml
- id: kebab-id
  claim: One-line statement of what is assumed
  witness_method: codesearch <query> | nodejs import | recall <query> | Read <path>
  witness_evidence: ""
  status: unknown
```

`status: unknown` → `witnessed` only when `witness_evidence` is filled with concrete proof (file:line, codesearch hit, dispatched test output). Resolution lives in gm-execute. PRD items reference mutables via optional `mutables: [id1, id2]` field; an item is blocked while any referenced mutable is unresolved.

## .prd format

Path: `./.gm/prd.yml`. Write via the Write tool or by emitting a nodejs spool file (`in/nodejs/<N>.js`) that calls `fs.writeFileSync`. Delete the file when empty.

```yaml
- id: kebab-id
  subject: Imperative verb phrase
  status: pending
  description: Precise criterion
  effort: small|medium|large
  category: feature|bug|refactor|infra
  route_family: grounding|reasoning|state|execution|observability|boundary|representation
  load: 0.0-1.0
  failure_modes: []
  route_fit: unexamined|examined|dominant
  authorization: none|weak_prior|witnessed
  blocking: []
  blockedBy: []
  acceptance:
    - binary criterion
  edge_cases:
    - failure mode
```

`load` is consequence-if-wrong: 0.9 = headline collapses, 0.7 = sub-argument rebuilt, 0.4 = local patch, 0.1 = nothing breaks. Verification budget = `load × (1 − tier_confidence)`. λ>0.75 must reach witnessed before EMIT.

`status`: pending → in_progress → completed (then remove). `effort`: small <15min | medium <45min | large >1h.

## Parallel subagent launch

After `.prd` is written, up to 3 parallel `gm:gm` subagents for independent items in one message. Browser tasks serialize.

```
Agent(subagent_type="gm:gm", prompt="Work on .prd item: <id>. .prd path: <path>. Item: <full YAML>.")
```

Items not parallelizable → invoke `gm-execute` directly.

## Observability gates in the plan

Server: every subsystem exposes `/debug/<subsystem>`; structured logs `{subsystem, severity, ts}`. Client: `window.__debug` live registry; modules register on mount. `console.log` is not observability. Discovery of a gap during PLAN adds a `.prd` item the same pass — never deferred.

`window.__debug` is THE in-page registry; `test.js` at project root is the sole out-of-page test asset. Any new file whose purpose is to exercise, smoke-test, demo, or sandbox in-page behavior outside that registry fights the discipline — extend the registry instead.

## Test discipline encoded in the plan

One `test.js` at project root, 200-line hard cap, real data, real system. No fixtures, mocks, or scattered tests. A second test runner under any name in any directory is a smuggled parallel surface.

The 200 lines are a *budget* for maximum surface coverage, not a target. Subsystems get one combined group each — names joined with `+` (`home+config+skin`, `mcp+swe+distributions+account+credpool`). When a new subsystem's failure mode overlaps an existing group's side-effects, fold the assertion in rather than creating a new group. When `wc -l test.js > 200`, the discipline is *merge groups + drop redundancy*, never split.

## Execution norms encoded in the plan

Code execution AND utility verbs both write to `.gm/exec-spool/in/<lang-or-verb>/<N>.<ext>`. Languages live under `in/<lang>/` (nodejs, python, bash, typescript, go, rust, c, cpp, java, deno); verbs live under `in/<verb>/` (codesearch, recall, memorize, wait, sleep, status, close, browser, runner, type, kill-port, forget, feedback, learn-status, learn-debug, learn-build, discipline, pause, health). The spool watcher runs the file and streams to `out/<N>.out` (stdout) + `out/<N>.err` (stderr) line-by-line, then writes `out/<N>.json` metadata (exitCode, durationMs, timedOut, startedAt, endedAt) at completion. Both streams return as systemMessage with `--- stdout ---` / `--- stderr ---` separators. `in/` and `out/` are wiped at session start and at real-exit session end. Only `git` (and `gh`) run directly via Bash; never `Bash(node/npm/npx/bun)`, never `Bash(exec:<anything>)`. Spool paths in nodejs files are platform-literal — use `os.tmpdir()` and `path.join`. The spool enforces per-task timeouts; on timeout, partial output is preserved and the watcher emits `[exec timed out after Nms; partial output above]`.

Codesearch only — never use Grep/Glob/Find/Explore. Write to `.gm/exec-spool/in/codesearch/<N>.txt`. Start two words, change/add one per pass, minimum four attempts before concluding absent.

Pack runs use `Promise.allSettled`, each idea its own try/catch, under 12s per call.

## Dev workflow encoded in the plan

No comments. 200-line per-file cap. Fail loud. No duplication. Scan before edit. AGENTS.md edits route through the memorize sub-agent only. CHANGELOG.md gets one entry per commit.

Minimal-code process, stop at the first that resolves: native → library → structure (map / pipeline) → write.

## Marker File Protocol

PLAN phase writes THREE marker files before transitioning to EXECUTE:
1. `.gm/prd.yml` — the work items (already written per PRD format above)
2. `.gm/needs-gm` — empty marker file signaling PRD is ready for orchestration
3. `.gm/gm-fired-<sessionId>` — signals that gm orchestration (planning) has run and cleared the gate

When `.gm/prd.yml` and `.gm/needs-gm` both exist, downstream tools check `.gm/gm-fired-<sessionId>` marker. If missing, tool execution blocks with reason: "gm orchestration in progress; skills must complete work before tools execute." This gate prevents tool use from tools that run BEFORE the orchestration phase is complete. Writing the marker clears this gate.

Write all three markers as final step of PLAN:
```
const fs = require('fs');
const path = require('path');
const sessionId = process.env.SESSION_ID || 'default';
fs.mkdirSync(path.join(process.cwd(), '.gm'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), '.gm', 'needs-gm'), '');
fs.writeFileSync(path.join(process.cwd(), '.gm', `gm-fired-${sessionId}`), '');
```

Transition to `gm-execute` (or `gm-gm` subagent) immediately after writing all files. No stop-for-approval; the transition is automatic.
