---
name: gm-emit
description: EMIT phase. Pre-emit debug, write files, post-emit verify from disk. Any new unknown triggers immediate snake back to planning — restart chain.
---

# GM EMIT — Write and verify from disk

Entry: every mutable KNOWN, from `gm-execute` or re-entered from VERIFY. Exit: gates clear → `gm-complete`.

Cross-cutting dispositions live in `gm` SKILL.md.

## Transitions

- All gates clear → `gm-complete`
- Post-emit variance with known cause → fix in-band, re-verify, stay in EMIT
- Pre-emit reveals known logic error → `gm-execute`
- Pre-emit reveals new unknown OR post-emit variance with unknown cause OR scope changed → `planning`

## Legitimacy gate (before pre-emit run)

For every claim landing in a file, answer five questions:

1. Earned specificity — does it trace to `authorization=witnessed`, or is it inflated from a weak prior?
2. Repair legality — is a local patch dressed as structural repair? Downgrade scope or regress to PLAN.
3. Lawful downgrade — can a weaker, true statement replace it? Prefer the downgrade.
4. Alternative-route suppression — is a live competing route being silenced? Preserve it.
5. Strongest objection — what would the sharpest reviewer pushback be? Articulate it. Cannot articulate = have not understood the alternatives → `gm-execute`.

Any failure regresses to `gm-execute` to witness what was missing, or `planning` if the gap is structural.

## Pre-emit run

Mandatory before writing any file. Write the probe to the spool (`.gm/exec-spool/in/nodejs/<N>.js`):

```
const { fn } = await import('/abs/path/to/module.js');
console.log(await fn(realInput));
```

Import the actual module from disk to witness current behavior as the baseline. Run the proposed logic in isolation without writing — witness with real inputs and with real error inputs. Match expected → write. Unexpected → new unknown → `planning`.

## Writing

Use the Write tool, or a nodejs spool file with `require('fs')`. Write only when every gate mutable resolves simultaneously.

## Post-emit verification

Re-import from disk — in-memory state is stale and inadmissible. Run identical inputs as pre-emit; output must match the baseline exactly. Known variance → fix and re-verify (self-loop). Unknown variance → `planning`.

## Mutables gate

Before pre-emit run, read `.gm/mutables.yml`. Any entry with `status: unknown` → regress to `gm-execute`. The pre-tool-use hook hard-blocks Write/Edit/NotebookEdit while unresolved entries exist; trying to emit anyway returns deny. Zero unresolved is the precondition for every legitimacy question below.

## Gate (all true at once)

- `.gm/mutables.yml` empty/absent OR every entry `status: witnessed` with filled `witness_evidence`
- Legitimacy gate passed; no refused collapse
- Pre-emit passed with real inputs and real error inputs
- Post-emit matches pre-emit exactly
- Hot-reloadable; errors throw with context (no `|| default`, no `catch { return null }`, no fallbacks)
- No mocks, fakes, stubs, or scattered test files (delete on discovery)
- Any behavior change has a corresponding assertion in `test.js` — a change no test catches is a change you cannot prove
- Browser-facing change → post-emit verify includes a live `exec:browser` witness (boot server → `page.goto` → `page.evaluate` asserting the invariant the change established). Node-side import + test.js does not satisfy this — the final gate runs again in `gm-complete`.
- Files ≤ 200 lines
- No duplicate concern (run `exec:codesearch` for the primary concern after writing; overlap → `planning`)
- No comments, no hardcoded values, no adjectives in identifiers, no unnecessary files
- Observability: new server subsystems expose `/debug/<subsystem>`; new client modules register in `window.__debug`
- Structure: no if/else where dispatch suffices; no one-liners that obscure; no reinvented APIs
- Every fact resolved this phase memorized via background `Agent(memorize)`
- CHANGELOG.md updated; TODO.md cleared or deleted
