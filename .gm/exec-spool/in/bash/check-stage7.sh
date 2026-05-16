#!/bin/bash
# Wait for stage7 task to complete
max_wait=60
elapsed=0
while [ ! -f /c/dev/gm/.gm/exec-spool/out/stage7-regen.json ] && [ $elapsed -lt $max_wait ]; do
  sleep 1
  elapsed=$((elapsed + 1))
done

if [ -f /c/dev/gm/.gm/exec-spool/out/stage7-regen.json ]; then
  echo "=== Task Complete ==="
  cat /c/dev/gm/.gm/exec-spool/out/stage7-regen.out
  echo ""
  echo "=== Metadata ==="
  cat /c/dev/gm/.gm/exec-spool/out/stage7-regen.json
else
  echo "Task did not complete within 60 seconds"
  ls -la /c/dev/gm/.gm/exec-spool/out/ 2>/dev/null || echo "No output directory"
fi
