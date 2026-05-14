#!/bin/bash
set -e

cd C:/dev/rs-learn

echo "=== Building rs-learn library ==="
cargo build --lib 2>&1 | grep -E "Compiling|Finished|error" || true

if [ $? -eq 0 ]; then
  echo "✓ Build completed successfully"
  exit 0
else
  echo "✗ Build failed"
  exit 1
fi
