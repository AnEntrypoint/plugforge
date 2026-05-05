---
name: research
description: Web research via parallel subagent fan-out. Use when a question needs the live web, spans multiple sources, requires comparison across vendors/papers/repos, or would saturate a single context window. Skip for one-page lookups answerable by a single WebFetch.
allowed-tools: Skill, Bash, Agent, WebFetch, WebSearch, Read, Write
---

# Research

Lead orchestrates. Workers fetch. Findings converge on disk. The lead never reads pages — workers do.

Effort matches stakes. A single fact is one short fetch. A vendor comparison is a handful of workers, each owning one vendor. A landscape survey is ten or more, each owning one axis. Spending a fan-out on a fact wastes tokens; spending a fact-fetch on a landscape under-delivers.

Breadth first, depth on demand. Open with a wide sweep that maps the terrain, then commit deep dives only where the sweep surfaces something load-bearing. A narrow opening misses the alternative the user actually needed.

## Worker contract

Each worker receives the precise question it owns, the shape of the answer (bullets, table row, prose paragraph), the boundary of what it must not pursue, and the destination path under `.gm/research/<slug>/<worker-id>.md`. Workers write structured findings to disk and return only a path plus a one-line summary. The lead reads the paths it cares about; the rest stay on disk. Returning full prose through the agent boundary burns context that the synthesis pass needs.

Workers run in parallel — independent questions launch in one message, never serialized.

## Citations

A claim without a source URL is a hallucination waiting to be quoted. Workers attach the URL and the quoted span beside every non-trivial assertion. The lead refuses to lift a claim into the final answer if its citation field is empty.

## Source quality

Vendor docs, RFCs, primary repos, dated blog posts from named authors, and academic preprints beat aggregator pages. When two sources disagree, the older primary usually beats the newer aggregator.

## Convergence

Synthesis happens once, after all workers return. Mid-flight summarisation truncates findings the next worker would have built on. If a worker's return reveals a new axis the original plan missed, expand the fan-out — do not stretch an existing worker past its brief.

## When not to fan out

One question, one page, one fetch. A single `WebFetch` answers it. The fan-out machinery has overhead; spending it on a lookup is the same mistake as skipping it on a survey.

## Handoff

Final answer cites every load-bearing claim, names the workers' output paths for audit, and surfaces disagreements rather than averaging them away.
