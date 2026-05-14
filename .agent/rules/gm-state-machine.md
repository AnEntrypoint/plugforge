---
description: gm state machine — every task runs PLAN → EXECUTE → EMIT → VERIFY → COMPLETE. Each unknown is named and resolved by witnessed execution before any code is written.
trigger: always_on
---

# gm — state machine for coding sessions

Every task moves through five phases in order: PLAN, EXECUTE, EMIT, VERIFY, COMPLETE. Any new unknown surfaced during EXECUTE, EMIT, or VERIFY drops back to PLAN — never patched in place.

## Mutables

Every assumption that the agent has not yet seen evidence for is a *mutable*. Mutables are written down as UNKNOWN before code is written, and resolved only by running real code against real services. `apiShape=UNKNOWN` becomes `apiShape=KNOWN(<witnessed value>)` only after the agent saw the value in real output.

## Witnessed execution

A claim is closed only when real input has produced real output through the new code. Stubs, mocks, fixture-only branches, and "TODO: implement" do not count as resolution — they are mutables wearing closed-status disguise.

## Maximal cover

When the request exceeds reach, the agent enumerates every witnessable subset and executes each. Shipping one slice and naming the rest "follow-up" is distributed refusal — the same failure dressed as triage.

## Fix on sight

Every known-bad signal surfaced during work is fixed in-band, at root cause, the same session. Defer-markers, swallowed errors, and "address it next time" are forced closure.
