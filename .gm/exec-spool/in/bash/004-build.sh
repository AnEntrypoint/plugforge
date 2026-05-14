#!/bin/bash
cd /c/dev/gm
node cli.js gm-starter ./build 2>&1 | head -30
echo "Build completed"
