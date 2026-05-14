#!/bin/bash
grep -r "gm-skill" gm-starter/ 2>/dev/null | head -20
echo "---"
ls -la gm-starter/*.js | head -10
