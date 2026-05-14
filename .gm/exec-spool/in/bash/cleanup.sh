#!/bin/bash
set -e
cd "C:\dev\gm"
rm -rf .gm/exec-spool/in .gm/exec-spool/out .gm/prd.yml .gm/mutables.yml .gm/residual-check-fired 2>&1 || true
echo "Cleanup complete"
