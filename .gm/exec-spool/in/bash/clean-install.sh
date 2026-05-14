#!/bin/bash
cd /c/dev/gm
rm -f package-lock.json
npm install 2>&1
echo "EXIT_CODE: $?"
