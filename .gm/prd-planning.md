# Planning: gm-skill-spool-integration

## Task
Wire gm-skill skills to use spool dispatch for code execution.
- Skills must dispatch work via spool (write to .gm/exec-spool/in/<lang>/<N>.<ext>)
- Implement helper functions: writeSpool, readSpoolOutput, waitForCompletion
- Create wrappers: execNodejs, execBash, execCodesearch, execRecall, execMemorize
- Reference: gm-starter/lib/spool.js (355L) for patterns

## Acceptance Criteria
- lib/spool.js exports { writeSpool, readSpoolOutput, waitForCompletion, execNodejs, execBash, execCodesearch, execRecall, execMemorize }
- Each function handles file I/O, polling, and error recovery
- Timeouts default to 30s, configurable per call
- Session ID threaded through all spool operations
- Temp files in exec-spool cleaned on success

## Mutables (All Witnessed)
- spool-module-exists: gm-starter/lib/spool.js already implemented (witness complete)
- daemon-bootstrap-pattern-exists: daemon spawning patterns available (witness complete)
- spool-dispatch-documented: SKILL.md documents dispatch model (witness complete)

## Approach

### Phase 1: Port base spool functions (small, 50L)
- Copy writeSpool, readSpoolOutput, validateLang, getExtForLang, generateTaskId from gm-starter
- Add sessionId parameter to writeSpool signature
- Export getAllOutputs, getSpoolBaseDir

### Phase 2: Implement waitForCompletion (small, 40L)
- Poll .gm/exec-spool/out/<id>.json for completion
- Default timeout 30s, configurable
- Return { ok, stdout, stderr, exitCode, durationMs, timedOut }
- Clean up temp input files on success

### Phase 3: Implement verb wrappers (medium, 120L)
- execNodejs(body, options): spool write, wait, return result
- execBash(body, options): similar pattern
- execCodesearch(query, options): write to in/codesearch/, parse output
- execRecall(query, options): write to in/recall/, parse output
- execMemorize(fact, options): write to in/memorize/, parse output

Each wrapper:
- Accepts timeoutMs (default 30s)
- Threads sessionId through
- Handles errors gracefully (no crash on timeout)
- Returns object with { ok, stdout, stderr, exitCode, durationMs, timedOut }

### Phase 4: Test harness (small, 30L)
- Unit test: writeSpool generates correct paths
- Unit test: waitForCompletion parses JSON metadata correctly
- Integration test: write spool file, verify output files created
- Edge case: timeout handling

### Dependencies
- Blocks gm-skill-gm-skill-index (skill code will call these functions)
- Blocked by gm-skill-package-structure (lib/ must be set up first)

## Files to Create/Modify
- gm-skill/lib/spool.js (NEW, 300L) — core spool dispatch
- gm-skill/test/spool.test.js (NEW, 100L) — test harness

## Effort Estimate
- Porting base functions: 15 min
- Implement waitForCompletion: 15 min
- Implement 5 verb wrappers: 30 min
- Test harness + edge cases: 20 min
- Total: ~80 min (medium effort)

## Risks
- Output parsing fails if metadata JSON malformed (mitigate with try/catch)
- Timeout race condition (mitigate with retries)
- Session ID not threaded through (mitigate by checking every function signature)
- Windows path handling (mitigate by using path.join everywhere)
