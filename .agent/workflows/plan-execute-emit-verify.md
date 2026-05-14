---
description: Step-by-step lifecycle for any non-trivial task. Drives the gm five-phase machine to a clean tree and a green test.
---

# plan → execute → emit → verify → complete

1. **Orient.** Recall prior decisions and search the codebase for existing implementations of every noun in the request. Write findings as weak priors; misses confirm fresh unknowns.

2. **Plan.** Enumerate every UNKNOWN. For each, name the failure mode, the dependency, and the acceptance criterion (real input → real output). Write the list to `.agent/plan.md` if the task spans more than one file.

3. **Execute.** Resolve every UNKNOWN with witnessed code execution before any file is written. Run the call, capture the output, paste the witnessed value next to the assumption it closes.

4. **Emit.** Once every mutable is closed, write the files. Re-witness post-write — file-on-disk plus working call, not just file-on-disk.

5. **Verify.** End-to-end against real data. No mocks. If a behavior is observable in the browser, the verification includes a live page assertion against the specific invariant the change establishes.

6. **Complete.** Tree clean, tests green, plan file deleted, commit pushed.

If a new unknown surfaces in steps 3–5, return to step 2 and expand the plan. Never patch a mutable mid-flight.
