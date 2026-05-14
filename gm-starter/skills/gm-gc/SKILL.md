---
name: gm-gc
description: AI-native software engineering via skill-driven orchestration on gc; bootstraps plugkit for task execution and session isolation
allowed-tools:
  - Skill
compatible-platforms:
  - gm-gc
---

# GM — gc Platform

AI-native software engineering orchestrated via skill chain: PLAN → EXECUTE → EMIT → VERIFY → UPDATE-DOCS.

bootstrapPlugkit() loads the plugkit binary (.gm-tools/plugkit) at session start, verifying sha256 against manifest. Session ID (SESSION_ID env or uuid fallback) threads through all task dispatch for cleanup scope.

Spool dispatch surface writes to `.gm/exec-spool/in/<lang>/<N>.<ext>` or `in/<verb>/<N>.txt`; watcher executes and streams metadata. Code execution and utility verbs all flow through spool — no inline bash or direct subprocess.

Every task returns complete: taskId, exitCode, durationMs, timedOut, stdout, stderr. Background tasks (daemonized) return immediately with task_id and streaming logfile; continue with exec:tail, exec:watch, or exec:close to manage lifecycle.

Session isolation prevents cross-session task leaks. RPC handlers verify session_id match on all task-scoped operations.
