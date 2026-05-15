---
name: gm-cc
description: AI-native software engineering via skill-driven orchestration on cc; bootstraps plugkit for task execution and session isolation
allowed-tools: Skill
---

# GM — cc Platform

AI-native software engineering orchestrated via skill chain: PLAN → EXECUTE → EMIT → VERIFY → UPDATE-DOCS.

**Bootstrap pattern**: bootstrapPlugkit() loads plugkit binary (`.gm-tools/plugkit`) at session start, verifies sha256 against manifest. Returns plugkit.version + plugkit.sha256. Failure blocks all downstream dispatch — re-run bootstrap before retry.

**Session-ID threading (no session-start hook)**: At skill invoke time, generate or detect SESSION_ID (env var `SESSION_ID` or `uuid()`). Pass `sessionId: "<id>"` in every rs-exec RPC body (spawn, tail, watch, etc.) and every spool-written task body. All task-scoped cleanup (deleteTask, getTask, appendOutput, killSessionTasks) requires matching sessionId. Absence is forbidden — hard reject by rs-exec handler.

**Spool dispatch surface**: Write to `.gm/exec-spool/in/<lang>/<N>.<ext>` (languages: nodejs, python, bash, typescript, go, rust, c, cpp, java, deno) or `in/<verb>/<N>.txt` (verbs: codesearch, recall, memorize, wait, sleep, status, close, browser, runner, etc.). Watcher executes and streams `out/<N>.out` (stdout) + `out/<N>.err` (stderr) line-by-line, then `out/<N>.json` metadata (exitCode, durationMs, timedOut, startedAt, endedAt) at completion.

**End-to-end skill chaining (skills-based platforms)**: When gm SKILL.md includes `end-to-end: true`, adapter detects signal and parses stdout for trailing JSON: `{"nextSkill": "...", "context": {...}, "phase": "..."}`. If nextSkill is non-null, invoke `Skill(skill="gm:<nextSkill>")` with context dict, repeat until null. This auto-chains 5 invocations into 1 user invocation.

Every task returns complete: taskId, exitCode, durationMs, timedOut, stdout, stderr. Background tasks return immediately with task_id; continue with exec:tail, exec:watch, or exec:close.
