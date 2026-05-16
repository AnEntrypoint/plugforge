---
name: textprocessing
description: The required surface for any text task whose correctness depends on understanding. Code does mechanics; this skill does meaning. Invoked via Agent(subagent_type='gm:textprocessing', model='haiku', ...).
allowed-tools: Skill
---

# Textprocessing — Meaning goes through Haiku

## Invocation

```
Agent(subagent_type='gm:textprocessing', model='haiku', prompt='## INPUT\n<body>\n\n## INSTRUCTION\n<task>')
```

Background fire-and-forget: add `run_in_background=true`. Batch: N parallel `Agent` calls in one message, one per item.

## The split

Mechanics stay in code: char/word/token/line counts, byte length, split on delimiter, exact-string find/replace, regex match/extract, sort, group-by-key, dedup-by-equality, lower/uppercase, JSON parse/stringify, base64, URL encode, hash, diff, format/pretty-print.

Meaning goes through this skill: summarize, classify, extract entities or intents, rewrite for tone or audience, translate, semantic dedup (same meaning, different words), rank or score by quality, label by topic, decide whether two texts are about the same thing, paraphrase, simplify, expand outline → prose, headline-from-body, body-from-headline, fact-from-passage, sentiment, toxicity, relevance, similarity-by-meaning.

The bar: would a human have to *read and understand* the text to do this correctly? Yes → skill. No → code. A keyword-list, a regex on phrases like "important", or a string-similarity ratio loop deciding meaning is a stub of this skill. Replace it with one (or N parallel) Agent calls.

## Batch

Independent items run in parallel — one Agent call per item, all in one message. The runner Promise-allSettles. Sequential calls are wasteful when items don't depend on each other.

For one large body exceeding a single-prompt budget, the *caller* chunks deterministically (paragraph, section, fixed token count), fans out one Agent per chunk, and merges with a final reducer Agent if cross-chunk synthesis is needed. The agent itself never chunks — it processes whatever it receives in one shot.

## Output contract

Plain-text instruction → plain-text output, no fences, no labels. JSON instruction → exactly that JSON, parseable by `JSON.parse`. Multi-document input requested as a list → one entry per input doc in the same order. Ambiguous shape → defaults to plain text. Empty input → empty output.

## Constraints

- Model fixed at `haiku`. Escalate to opus only when haiku output fails an acceptance check.
- One transform per call. Three parallel calls beats one prompt asking for "summarize AND classify AND translate".
- Idempotent: same input + same instruction → same output, modulo sampling. Strict determinism callers specify `temperature=0` in the prompt.
- Output is the deliverable. No commentary, no "here is your output".
