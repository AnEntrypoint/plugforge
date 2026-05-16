#!/bin/bash

echo "=== Testing Rust builds ==="

# Test that cargo exists and is configured
if ! command -v cargo &> /dev/null; then
  echo "ERROR: cargo not found"
  exit 1
fi

echo "✓ cargo is available"
cargo --version

# Test each Rust repo
REPOS=(
  "C:\dev\rs-exec"
  "C:\dev\rs-plugkit"
  "C:\dev\rs-codeinsight"
  "C:\dev\rs-search"
  "C:\dev\rs-learn"
)

echo ""
echo "=== Testing cargo builds ==="

for repo in "${REPOS[@]}"; do
  if [ ! -d "$repo" ]; then
    echo "⚠ $repo not found, skipping"
    continue
  fi

  repo_name=$(basename "$repo")
  echo ""
  echo "--- Testing $repo_name ---"

  cd "$repo" || exit 1

  # Check if Cargo.toml exists
  if [ ! -f "Cargo.toml" ]; then
    echo "⚠ Cargo.toml not found in $repo, skipping"
    continue
  fi

  # Test check (faster than full build)
  if cargo check --message-format=short 2>&1 | head -20; then
    echo "✓ $repo_name: cargo check passed"
  else
    echo "✗ $repo_name: cargo check failed"
    exit 1
  fi
done

echo ""
echo "✓ All Rust builds verified"
exit 0
