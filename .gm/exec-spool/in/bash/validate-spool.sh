#!/bin/bash

echo "=== Validation Test Suite ==="
echo ""

# Test 1: Core lib files
echo "Test 1: Checking core lib files..."
for file in lib/daemon-bootstrap.js lib/spool-dispatch.js lib/skill-bootstrap.js; do
  if [ -f "C:\dev\gm\$file" ]; then
    echo "  ✓ $file exists"
  else
    echo "  ✗ $file missing"
  fi
done

# Test 2: Build exists
echo ""
echo "Test 2: Checking build directory..."
if [ -d "C:\dev\gm\build" ]; then
  count=$(ls -d C:\dev\gm\build\gm-* 2>/dev/null | wc -l)
  echo "  ✓ Build exists with $count platforms"
else
  echo "  ✗ Build directory not found"
fi

# Test 3: Lib files in build
echo ""
echo "Test 3: Checking lib files in gm-cc..."
if [ -f "C:\dev\gm\build\gm-cc\lib\daemon-bootstrap.js" ]; then
  echo "  ✓ gm-cc has daemon-bootstrap.js"
else
  echo "  ✗ gm-cc missing daemon-bootstrap.js"
fi

if [ -f "C:\dev\gm\build\gm-cc\lib\spool-dispatch.js" ]; then
  echo "  ✓ gm-cc has spool-dispatch.js"
else
  echo "  ✗ gm-cc missing spool-dispatch.js"
fi

# Test 4: No hooks in build
echo ""
echo "Test 4: Checking that hooks are absent..."
if [ ! -d "C:\dev\gm\build\gm-cc\hooks" ]; then
  echo "  ✓ gm-cc has no hooks/ directory"
else
  echo "  ✗ gm-cc still has hooks/ directory"
fi

echo ""
echo "=== Validation Complete ==="
