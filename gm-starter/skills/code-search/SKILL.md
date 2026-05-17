---
name: code-search
description: Mandatory codebase search workflow. Use whenever you need to find anything in the codebase. Start with two words, iterate by changing or adding words until found.
---

# Codebase search

`exec:codesearch` is the only codebase search tool. Never use Grep, Glob, Find, Explore, raw `grep`/`rg`/`find` inside `exec:bash`. No fallback.

A `@<discipline>` first-token after the verb scopes the search to that discipline's index; absent the sigil, results fan across default plus enabled disciplines, prefixed by source.

Handles exact symbols, exact strings, file-name fragments, regex-ish patterns, natural-language queries, and PDF pages (cite `path/doc.pdf:<page>`).

Direct-read exceptions: known absolute path → `Read`. Known directory listing → `exec:nodejs` + `fs.readdirSync`.

## Syntax

```
exec:codesearch
<two-word query>
```

## Iteration

Start at exactly two words. No results → change one word. Still none → add a third. Still none → swap the changed word again. Minimum four attempts before concluding absent. Never one word, never a full sentence, never switch tools.

## Examples

```
exec:codesearch
session cleanup idle
```

No results, then:

```
exec:codesearch
cleanup sessions timeout
```

PDF:

```
exec:codesearch
usb descriptor endpoint
```

Returns `docs/usb-spec.pdf:42` — cite the page; `Read` if surrounding text is needed.
