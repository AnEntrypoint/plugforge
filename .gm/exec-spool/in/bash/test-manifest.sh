#!/bin/bash
cd "$(git rev-parse --show-toplevel)"
node -e "
const m = require('./gm-skill/lib/manifest.js');
const skills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];
let pass = true;
for (const s of skills) {
  const skill = m.getManifest(s);
  if (!skill || !skill.name || skill.description.length < 20) {
    console.log('FAIL: ' + s);
    pass = false;
  } else {
    console.log('OK: ' + s);
  }
}
process.exit(pass ? 0 : 1);
"
