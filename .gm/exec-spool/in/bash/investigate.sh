#!/bin/bash
echo "=== Searching for gm-skill directory ==="
find /c/dev -maxdepth 3 -type d -name "*gm-skill*" 2>/dev/null

echo ""
echo "=== All dirs in C:\dev ==="
ls -la /c/dev/

echo ""
echo "=== Searching for lib/session.js ==="
find /c/dev -name "session.js" 2>/dev/null

echo ""
echo "=== Searching for lib/manifest.js ==="
find /c/dev -name "manifest.js" 2>/dev/null

echo ""
echo "=== Checking gm package.json for gm-skill references ==="
grep -i "gm-skill" /c/dev/gm/package.json 2>/dev/null || echo "No references found"

echo ""
echo "=== Checking for .gitmodules ==="
cat /c/dev/gm/.gitmodules 2>/dev/null || echo "No .gitmodules file"
