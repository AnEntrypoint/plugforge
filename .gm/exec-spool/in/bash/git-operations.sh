#!/bin/bash
set -e

cd C:\\dev\\gm

echo "=== Git Operations ==="

# Clean up spool state files that shouldn't be committed
echo "Cleaning spool state files..."
git restore .gm/exec-spool/.status.json .gm/exec-spool/.watcher.heartbeat 2>/dev/null || true

# Check current status
echo ""
echo "Current branch:"
git branch

echo ""
echo "Remote branches:"
git branch -r

# Fetch latest from remote
echo ""
echo "Fetching from remote..."
git fetch origin

# Try merge (not rebase to avoid interactive issues)
echo ""
echo "Merging origin/main..."
git merge origin/main --no-edit

echo ""
echo "=== Push to remote ==="
git push origin main

echo ""
echo "✓ Git operations completed"
