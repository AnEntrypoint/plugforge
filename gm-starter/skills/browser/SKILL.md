---
name: browser
description: Browser automation via playwriter. Use when user needs to interact with websites, navigate pages, fill forms, click buttons, take screenshots, extract data, test web apps, or automate any browser task.
allowed-tools: Skill, Bash, Read, Write, Edit, Agent
---

# Browser automation

Two pathways — never mix in the same Bash call.

`exec:browser` runs JS against `page`. Globals available: `page`, `snapshot`, `screenshotWithAccessibilityLabels`, `state`. 15s live window, then backgrounds; output drains automatically on every subsequent plugkit call.

`browser:` prefix is playwriter session management. One command per block.

## Core

```
exec:browser
await page.goto('https://example.com')
await snapshot({ page })
```

```
browser:
playwriter session new --direct
```

```
browser:
playwriter -s 1 -e 'await page.goto("http://example.com")'
```

Session state persists across `browser:` calls. `-e` arg uses single quotes outside, double inside JS strings.

## Timing

Never `await setTimeout(N)` with N > 10000. Poll instead.

```
exec:browser
const start = Date.now()
while (!state.done && Date.now() - start < 12000) {
  await new Promise(r => setTimeout(r, 500))
}
console.log(state.result)
```

`Assertion failed: UV_HANDLE_CLOSING` is normal background-on-exit noise; ignore it.

## Patterns

Data extraction:

```
exec:browser
const items = await page.$$eval('.title', els => els.map(e => e.textContent))
console.log(JSON.stringify(items))
```

Console monitoring — set listeners first, then poll:

```
exec:browser
state.logs = []
page.on('console', msg => state.logs.push({ type: msg.type(), text: msg.text() }))
```

```
exec:browser
console.log(JSON.stringify(state.logs.slice(-20)))
```

## Constraints

- One playwriter command per `browser:` block
- `exec:browser` is plain JS, no shell quoting
- Browser tasks drain automatically on every plugkit interaction
- Sessions reap after 5–15 min idle; cleaned up on session end
- Never write standalone `.mjs`/`.js` Playwright scripts as a fallback — `exec:browser` errors must be debugged through `exec:browser` retries, not by creating test files on disk
