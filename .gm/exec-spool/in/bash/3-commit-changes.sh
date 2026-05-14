#!/bin/bash
set -e

cd C:/dev/rs-learn

echo "=== Staging rs-learn backend changes ==="
git add src/backend/mod.rs src/lib.rs
git status --short

echo ""
echo "=== Committing changes ==="
git commit -m "refactor: make acptoapi exclusive LLM backend for rs-learn

Remove Claude SDK (anthropic crate) and ACP client implementations.
OpenAiCompatClient becomes the sole backend, reading environment variables:
  - OPENAI_BASE_URL (defaults to http://127.0.0.1:4800)
  - OPENAI_MODEL (model selection)
  - OPENAI_API_KEY (authentication)

This change consolidates all LLM access through the acptoapi HTTP server
which bridges ACP-compatible agents (hermes, cline, codex, opencode, etc.)
to a standard OpenAI-compatible /v1/chat/completions interface.

Related: rs-plugkit session_start now auto-spawns acptoapi daemon."

echo ""
echo "=== Pushing to origin main ==="
git push origin main

echo "✓ Changes committed and pushed"
