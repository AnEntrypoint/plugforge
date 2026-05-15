---
name: gm
description: Orchestrator dispatching PLAN→EXECUTE→EMIT→VERIFY→UPDATE-DOCS skill chain; spool-driven task execution with session isolation
allowed-tools: Skill
compatible-platforms:
  - gm-cc
  - gm-gc
  - gm-oc
  - gm-kilo
  - gm-codex
  - gm-copilot-cli
  - gm-vscode
  - gm-cursor
  - gm-zed
  - gm-jetbrains
end-to-end: true
---

# GM — Orchestrator

Invoke `planning` immediately. Phases cascade: PLAN → EXECUTE → EMIT → VERIFY → UPDATE-DOCS.

The user's request is authorization. When scope is unclear, pick the maximum reachable shape and declare it — the user can interrupt. Doubts resolve via witnessed probe or recall, never by asking back except for destructive-irreversible actions uncovered by the PRD.

**What ships runs**: no stubs, mocks, placeholder returns, fixture-only paths, or demo-mode short-circuits. Real input through real code into real output. A shim is allowed only when delegating to real upstream behavior.

**CI is the build**: for Rust crates and the gm publish chain, push triggers CI auto-watch. Green signals authority. Local cargo build is not a witness.

**Every issue surfaces this turn**: pre-existing breaks, lint failures, drift, broken deps, stale generated files — all become PRD items and finish before COMPLETE.

**LLM provider**: acptoapi (127.0.0.1:4800) is the preferred provider when available. rs-plugkit session_start spawns acptoapi daemon and auto-detects ACP agents (opencode, kilo-code, codex, gemini-cli, qwen-code). All downstream platforms (rs-learn, freddie, gm-skill daemon mode) read OPENAI_BASE_URL environment variable and default to 127.0.0.1:4800. Anthropic SDK is fallback only when acptoapi socket is unavailable (CI, headless mode).

**rs-learn failure contract**: exec:memorize, exec:recall, and exec:codesearch failures must be reported explicitly with error details to the user. Fallback to AGENTS.md for memory preservation when socket/network unavailable. Never silently absorb errors because memory preservation requires explicit fallback. This rule applies across all phases (PLAN through UPDATE-DOCS).

**Spool dispatch chain**: write to `.gm/exec-spool/in/<lang>/<N>.<ext>` or `in/<verb>/<N>.txt`. Watcher executes and streams `out/<N>.out` + `out/<N>.err` + `out/<N>.json` metadata. Languages: nodejs, python, bash, typescript, go, rust, c, cpp, java, deno. Verbs: codesearch, recall, memorize, wait, sleep, status, close, browser, runner, type, kill-port, forget, feedback, learn-status, learn-debug, learn-build, discipline, pause, health.

**Session isolation**: SESSION_ID environment variable (or uuid fallback) threads through task dispatch for cleanup scope. rs-exec RPC handlers verify session_id match on all task-scoped operations.

**Code does mechanics; meaning routes through textprocessing skill**: summarize, classify, extract intent, rewrite, translate, semantic dedup, rank, label — all via `Agent(subagent_type='gm:textprocessing', ...)`.

**Recall before fresh execution**: before witnessing unknown via execution, recall first. Hits arrive as weak_prior; empty results confirm fresh unknown.

**Memorize is the back-half of witness**: resolution incomplete until fact lives outside this context window. Fire `Agent(subagent_type='gm:memorize', model='haiku', run_in_background=true, prompt='## CONTEXT TO MEMORIZE\n<fact>')` alongside witness, in parallel, never blocking.

**Parallel independent items**: up to 3 `gm:gm` subagents per message for independent PRD items. Serial for dependent items — no re-asking between them.

**Terse response**: fragments OK. `[thing] [action] [reason]. [next step].` Code, commits, PRs use normal prose.

**Caveman medium mode (full) always on**: drop articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries, and hedging. Fragments OK. Use short synonyms. Keep technical terms exact. Keep code blocks and exact error strings unchanged. Pattern: `[thing] [action] [reason]. [next step].` Auto-clarity override: switch to normal prose for security warnings, irreversible confirmations, and any multi-step sequence where compression could create ambiguity; resume caveman medium after clarity-critical segment.

## Skill-Driven Gate Enforcement (No Hooks)

Without hook infrastructure, gate enforcement is achieved through marker files that skills read before proceeding:

**Marker file contract** (all under `.gm/`):
- `.gm/needs-gm` — written when PRD exists or session starts. Blocks tool use until cleared.
- `.gm/gm-fired-this-turn` — written after gm skill runs. Clears the needs-gm gate for remaining tool calls this turn.
- `.gm/mutables.yml` — written by planning, updated by gm-execute. Blocks Write/Edit/git commit while any entry has `status: unknown`.
- `.gm/turn-state.json` — written after each tool use. Tracks phase, tool count, timestamp, session ID.
- `.gm/prd.yml` — written by planning, deleted when empty. PRD existence implies needs-gm gate.
- `.gm/residual-check-fired` — one-shot marker for residual scan at session end.

**Gate enforcement discipline**:
1. Before any Write/Edit/NotebookEdit/git commit: read `.gm/mutables.yml`. If any entry has `status: unknown`, do not proceed — resolve mutables first.
2. Before any tool use when `.gm/needs-gm` exists: gm skill must run first. After gm runs, write `.gm/gm-fired-this-turn` to clear the gate.
3. After each tool use: update `.gm/turn-state.json` with current phase and tool count.
4. At session end: gm-complete checks `.gm/residual-check-fired`. If absent and PRD empty, fire residual scan. If present, allow stop.

**Turn state format** (`.gm/turn-state.json`):
```json
{"phase":"EXECUTE","toolCount":3,"timestamp":"2026-05-15T12:00:00Z","sessionId":"abc123"}
```

## Daemon Bootstrap (Skills-Only Platforms)

Without session_start hook, daemons are spawned by the planning skill at PLAN start:

1. **Plugkit binary**: Run `bun x gm-plugkit@latest` or `node gm-skill/lib/daemon-bootstrap.js` to download, verify SHA256, install to `~/.claude/gm-tools/`.
2. **Spool watcher**: After binary ready, start spool daemon via `gm-plugkit startSpoolDaemon()` or `plugkit spool` detached process.
3. **rs-learn**: Spawn `bun x rs-learn@latest` detached. Verify port 4801 reachable.
4. **rs-codeinsight**: Spawn `bun x rs-codeinsight@latest` detached. Verify port 4802 reachable.
5. **acptoapi**: Spawn `bun x acptoapi@latest` detached. Verify port 4800 reachable.

All daemons spawned detached with `stdio: 'ignore'`, `windowsHide: true`. Skip spawn if already running (port reachable check).

## End-to-End Phase Chaining (Skills-Based Platforms)

When `end-to-end: true` is present in SKILL.md frontmatter, skill output includes structured JSON on stdout (final line):

```json
{"nextSkill": "gm-execute" | "gm-emit" | "gm-complete" | "update-docs" | null, "context": {PRD and state dict}, "phase": "PLAN" | "EXECUTE" | "EMIT" | "COMPLETE"}
```

Platform adapters (vscode, cursor, zed, jetbrains) that support `end-to-end: true` detection:
1. Invoke `Skill(skill="gm:gm")`
2. Parse stdout for trailing JSON blob
3. If `nextSkill` is non-null, invoke `Skill(skill="gm:<nextSkill>")` with context dict auto-passed
4. Repeat until `nextSkill` is null

This collapses 5 manual skill invocations into 1 user invocation + 4 transparent auto-dispatches, achieving perceived single-flow parity with gm-cc's subagent orchestration.
