#!/bin/bash

echo "=== Finding HTML documentation files ==="
echo ""

find "C:\\dev\\gm\\docs" -name "*.html" -type f 2>/dev/null | head -20

echo ""
echo "=== Checking main index.html ==="

if [ -f "C:\\dev\\gm\\docs\\index.html" ]; then
  echo "✓ docs/index.html exists"
  head -20 "C:\\dev\\gm\\docs\\index.html"
else
  echo "✗ docs/index.html not found"
fi
