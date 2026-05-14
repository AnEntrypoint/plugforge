#!/bin/bash
echo "=== Subdirectories in /c/dev ==="
ls -1 /c/dev/ | grep -v "^\." || echo "None found"

echo ""
echo "=== Searching entire /c/dev for gm-skill ==="
find /c/dev -type d -name "*skill*" 2>/dev/null | head -20

echo ""
echo "=== Searching for session.js ==="
find /c/dev -type f -name "session.js" 2>/dev/null

echo ""
echo "=== Searching for manifest.js ==="
find /c/dev -type f -name "manifest.js" 2>/dev/null

echo ""
echo "=== Checking gm/package.json dependencies ==="
grep -A 20 "\"dependencies\"" /c/dev/gm/package.json | grep -i skill || echo "No skill references in dependencies"

echo ""
echo "=== Checking gm/.gitmodules ==="
if [ -f /c/dev/gm/.gitmodules ]; then
  cat /c/dev/gm/.gitmodules
else
  echo "No .gitmodules file in gm"
fi
