---
name: textprocessing
description: The required surface for any text task whose correctness depends on understanding. Code does mechanics; this skill does meaning. Invoked via Agent(subagent_type='gm:textprocessing', model='haiku', ...).
allowed-tools: Agent, Read, Write, Edit, Bash, Skill
---

# Textprocessing — Meaning Goes Through Haiku

## INVOCATION

```
Agent(subagent_type='gm:textprocessing', model='haiku', prompt='## INPUT\n<body>\n\n## INSTRUCTION\n<task>')
```

Background fire-and-forget: add `run_in_background=true`. Batch: N parallel `Agent` calls in ONE message, one per item.

## WHEN TO USE — HARD RULE

Mechanics in code. Meaning through this skill.

**Mechanics (code, not skill)**: char/word/token/line count, byte length, split on delimiter, exact-string find/replace, regex match/extract, sort, group-by-key, dedup-by-equality, lowercase/uppercase, JSON parse/stringify, base64, URL encode, hash, diff, format/pretty-print.

**Meaning (skill, not code)**: summarize, classify, extract entities/intents, rewrite for tone/audience, translate, semantic dedup (same meaning, different words), rank/score by quality, label by topic, decide if two texts are "about the same thing", paraphrase, simplify, expand outline → prose, headline-from-body, body-from-headline, fact-from-passage, sentiment, toxicity, relevance, similarity-by-meaning.

A code loop that decides meaning by keyword lists, regex on phrases like "important", or string-similarity ratios *is a stub of this skill*. Replace it with one (or N parallel) `Agent(textprocessing)` calls.

The bar: would a human have to *read and understand* the text to do this correctly? Yes → skill. No → code.

## BATCH PATTERN

Independent items run in parallel — one `Agent` call per item, all in ONE message. The runner Promise-allSettles. Sequential calls are wasteful and forbidden when items don't depend on each other.

For one large body exceeding a single-prompt budget: the *caller* chunks deterministically (by paragraph, section, fixed token count) and fans out one Agent per chunk, merges with a final reducer Agent if cross-chunk synthesis is needed. The agent itself never chunks — it processes whatever it receives in one shot.

## OUTPUT CONTRACT

Plain-text instruction → plain-text output, no fences, no labels.
JSON instruction (e.g. "return as a JSON array of `{id, label}`") → exactly that JSON, parseable by `JSON.parse`.
Multi-document input requested as a list → one entry per input doc in the same order.

If the prompt was ambiguous about output shape, the agent defaults to plain text. Empty input → empty output.

## CONSTRAINTS

- Model fixed at `haiku`. Cheap and fast. Escalate to opus only when haiku output fails an acceptance check, never preemptively.
- One transform per call. Don't ask one prompt to "summarize AND classify AND translate" — three calls in parallel is faster and the outputs are cleaner.
- Idempotent: same input + same instruction → same output (modulo sampling). Callers needing strict determinism specify `temperature=0` in the prompt.
- Never wraps output in commentary, explanation, or "here is your output". The output IS the deliverable.
