#!/bin/bash

echo "=== Verifying gm-cc has spool-dispatch updates ==="
echo ""

if [ ! -d "C:\\dev\\gm-cc" ]; then
  echo "⚠ gm-cc not cloned locally at C:\\dev\\gm-cc"
  echo "To verify, clone: git clone https://github.com/AnEntrypoint/gm-cc C:\\dev\\gm-cc"
  exit 0
fi

echo "Checking gm-cc structure..."
echo ""

# Check for hooks directory (should NOT exist)
if [ -d "C:\\dev\\gm-cc\\hooks" ]; then
  echo "✗ PROBLEM: hooks/ directory still exists in gm-cc"
  exit 1
fi

echo "✓ No hooks/ directory (spool-dispatch ready)"

# Check for daemon-bootstrap.js
if [ -f "C:\\dev\\gm-cc\\lib\\daemon-bootstrap.js" ]; then
  echo "✓ daemon-bootstrap.js present"
else
  echo "✗ daemon-bootstrap.js NOT found"
  exit 1
fi

# Check for spool-dispatch.js
if [ -f "C:\\dev\\gm-cc\\lib\\spool-dispatch.js" ]; then
  echo "✓ spool-dispatch.js present"
else
  echo "✗ spool-dispatch.js NOT found"
  exit 1
fi

# Check package.json for daemon-bootstrap reference
if grep -q "daemon-bootstrap" "C:\\dev\\gm-cc\\package.json" 2>/dev/null; then
  echo "✓ daemon-bootstrap referenced in package.json"
else
  echo "⚠ daemon-bootstrap not referenced in package.json"
fi

echo ""
echo "✓ gm-cc appears to have spool-dispatch updates"
