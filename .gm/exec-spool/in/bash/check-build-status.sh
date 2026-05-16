#!/bin/bash

echo "=== Checking build output ==="

if [ ! -d "C:\\dev\\gm\\build" ]; then
  echo "Build directory does not exist yet."
  echo "To generate platforms, run: node cli.js gm-starter ./build"
  exit 0
fi

echo "Build directory exists."
echo ""
echo "Generated platforms:"
ls -1 "C:\\dev\\gm\\build" | grep "^gm-" | while read platform; do
  if [ -d "C:\\dev\\gm\\build\\$platform\\hooks" ]; then
    echo "✗ $platform has hooks/ directory (ERROR)"
  else
    echo "✓ $platform (no hooks/)"
  fi
done
