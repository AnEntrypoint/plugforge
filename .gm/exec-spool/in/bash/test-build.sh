#!/bin/bash
cd C:\dev\gm
node cli.js gm-starter ./test-build 2>&1 | tail -30
