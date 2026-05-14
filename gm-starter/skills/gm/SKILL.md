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

**Spool dispatch chain**: write to `.gm/exec-spool/in/<lang>/<N>.<ext>` or `in/<verb>/<N>.txt`. Watcher executes and streams `out/<N>.out` + `out/<N>.err` + `out/<N>.json` metadata. Languages: nodejs, python, bash, typescript, go, rust, c, cpp, java, deno. Verbs: codesearch, recall, memorize, wait, sleep, status, close, browser, runner, type, kill-port, forget, feedback, learn-status, learn-debug, learn-build, discipline, pause, health.

**Session isolation**: SESSION_ID environment variable (or uuid fallback) threads through task dispatch for cleanup scope. rs-exec RPC handlers verify session_id match on all task-scoped operations.

**Code does mechanics; meaning routes through textprocessing skill**: summarize, classify, extract intent, rewrite, translate, semantic dedup, rank, label — all via `Agent(subagent_type='gm:textprocessing', ...)`.

**Recall before fresh execution**: before witnessing unknown via execution, recall first. Hits arrive as weak_prior; empty results confirm fresh unknown.

**Memorize is the back-half of witness**: resolution incomplete until fact lives outside this context window. Fire `Agent(subagent_type='gm:memorize', model='haiku', run_in_background=true, prompt='## CONTEXT TO MEMORIZE\n<fact>')` alongside witness, in parallel, never blocking.

**Parallel independent items**: up to 3 `gm:gm` subagents per message for independent PRD items. Serial for dependent items — no re-asking between them.

**Terse response**: fragments OK. `[thing] [action] [reason]. [next step].` Code, commits, PRs use normal prose.

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
