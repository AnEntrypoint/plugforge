---
name: gm-complete
description: VERIFY and COMPLETE phase. End-to-end system verification and git enforcement. Any new unknown triggers immediate snake back to planning — restart chain.
---

# GM COMPLETE — Verify, then close

Entry: EMIT gates clear, from `gm-emit`. Exit: `.prd` deleted + test.js green + pushed + CI green → `update-docs`.

Cross-cutting dispositions live in `gm` SKILL.md.

## Transitions

- `.prd` items remain → `gm-execute`
- `.prd` empty AND test.js green AND pushed AND CI green → `update-docs`
- Broken file output → `gm-emit`
- Wrong logic → `gm-execute`
- New unknown or wrong requirements → `planning`

Failure triage: broken output to EMIT, wrong logic to EXECUTE, new unknown to PLAN. Never patch around surprises.

## Mutables that must resolve before COMPLETE

- `witnessed_e2e` — real end-to-end run with witnessed output
- `browser_validated` — for any change touching client / UI / browser-facing code, see gate below. test.js + node-side imports DO NOT satisfy this gate.
- `git_clean` — `git status --porcelain` returns empty
- `git_pushed` — `git log origin/main..HEAD --oneline` returns empty
- `ci_passed` — every GitHub Actions run reaches `conclusion: success`
- `prd_empty` — `.gm/prd.yml` deleted
- `stress_suite_clear` — change walked through M1–D1 (governance), none flunked
- `hidden_decision_posture` — open → down_weighted → closed only when CI is green AND stress suite is clear

## End-to-end verification

Real system, real data, witness actual output. Doc updates, "saying done", and screenshots alone are not verification.

```
exec:nodejs
const { fn } = await import('/abs/path/to/module.js');
console.log(await fn(realInput));
```

After every success, enumerate what remains — never stop at first green.

## Browser validation gate

Required when this session changed any code that runs in a browser: anything under `client/`, UI components, shaders, page-loaded JS, served HTML, gh-pages assets, dev-server endpoints, or any module imported into the page bundle.

Trigger detection (any one): `git diff --name-only origin/main..HEAD` includes paths under `client/`, `apps/*/index.js` with client export, `docs/`, `*.html`, shader files, or any file imported by a browser entry; new/changed export consumed by `window.*` or rendered in DOM/canvas/WebGL; visual, layout, animation, input, network-on-page, or shader behavior altered.

Protocol: boot the real server (or open the static page) on a known URL — witness HTTP 200. `exec:browser` → `page.goto(url)` → wait for app init by polling for the global the change affects (`window.__app.<system>`). Probe via `page.evaluate(() => …)` asserting the specific invariant the change was supposed to establish — instance counts, scene meshes, DOM nodes, render stats, network frames. Capture witnessed numbers in the response — "looks fine" is not a witness. Failures route to `gm-execute` (logic) or `gm-emit` (output) — never paper over.

Long-running probes split into navigate-call → `exec:wait N` → probe-call to stay under the per-call budget. Do not stack multi-second `setTimeout` inside one `exec:browser` invocation.

Exempt only when: change is server-only with zero browser-facing surface, OR the repository has no browser surface at all (pure CLI / library). Exemption requires explicit tag in the response: `BROWSER EXEMPT: <reason — must reference diff paths showing zero browser-facing surface>`. Default posture is NOT exempt — burden is on the agent to prove exemption with diff evidence.

Pre-flight: run `git diff --name-only origin/main..HEAD` and grep for `client/|docs/|\.html$|\.glsl$|\.frag$|\.vert$`. Any hit AND no `exec:browser` block in this session → mandatory regression to `gm-execute`.

## Integration test gate

```
exec:nodejs
const { execSync } = require('child_process');
try { execSync('node test.js', { stdio: 'inherit', timeout: 30000 }); console.log('PASS'); }
catch (e) { console.error('FAIL'); process.exit(1); }
```

Failure → `gm-execute`. No test.js in a repo with testable surface → `gm-execute` to create it.

## Git enforcement

```
exec:bash
git status --porcelain
git log origin/main..HEAD --oneline
```

Both must return empty. Local commit without push is not complete.

## CI is automated

The Stop hook watches Actions for the pushed HEAD. Do not call `gh run list` manually. All-green → Stop approves with CI summary in next-turn context. Failure → Stop blocks with run names + IDs; investigate via `gh run view <id> --log-failed`, fix, push, hook re-watches. Deadline 180s (override `GM_CI_WATCH_SECS`); slow jobs get a "still in progress" approve.

## Hygiene sweep

1. Files >200 lines → split
2. Comments in code → remove
3. Scattered test files (`.test.js`, `.spec.js`, `__tests__/`, `fixtures/`, `mocks/`) → delete, consolidate into root `test.js`
4. Mock / stub / simulation files → delete
5. Unnecessary doc files (not CHANGELOG, CLAUDE, README, TODO.md) → delete
6. Duplicate concern → regress to `planning` with restructuring instructions
7. Hardcoded values → derive from ground truth
8. Fallback / demo modes → remove, fail loud
9. TODO.md → empty or deleted
10. CHANGELOG.md → entries for this session
11. Observability gaps → server subsystems expose `/debug/<subsystem>`; client modules register in `window.__debug`
12. Memorize → every fact from verification handed off via background `Agent(memorize)` at moment of resolution
13. Deploy / publish → if deployable, deploy; if npm package, publish
14. GitHub Pages → check `.github/workflows/pages.yml` + `docs/index.html` exist; invoke `pages` skill if absent
15. Governance stress-suite → walk change through M1, F1, C1, H1, S1, B1, A1, D1; any flunk regresses to the owning phase

## Completion

All true at once: witnessed e2e | browser_validated when client work touched | failure paths exercised | test.js passes | `.prd` deleted | git clean and pushed | CI green | hygiene sweep clean | TODO.md gone | CHANGELOG.md updated.
