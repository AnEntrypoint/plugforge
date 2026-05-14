#!/bin/bash
rm -f "$HOME/../.gm/prd.yml" 2>/dev/null || rm -f "./.gm/prd.yml" 2>/dev/null || rm -f "C:\dev\gm\.gm\prd.yml"
echo "PRD file deleted"
ls -la .gm/prd.yml 2>&1 || echo "Confirmed: prd.yml no longer exists"
