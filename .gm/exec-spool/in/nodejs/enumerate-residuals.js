const fs = require('fs');
const path = require('path');

const residuals = [];

residuals.push({
  category: 'integration',
  item: 'gm-skill npm package into 12 downstream repos (gm-cc, gm-gc, gm-oc, gm-kilo, gm-codex, gm-qwen, gm-copilot-cli, gm-hermes, gm-vscode, gm-cursor, gm-zed, gm-jetbrains)',
  scope: 'in-spirit',
  reach: 'reachable',
  reason: 'User mandate: maximize skill-only build coverage; gm-skill scaffolded and pushed, now integrate into all platforms per template pattern'
});

residuals.push({
  category: 'build',
  item: 'Rebuild all 10 platform outputs (node cli.js gm-starter ./build) to inherit gm-skill integration',
  scope: 'in-spirit',
  reach: 'reachable',
  reason: 'Prerequisite for downstream repos; all platforms must regenerate to pull gm-skill into skill loading'
});

residuals.push({
  category: 'daemon-consolidation',
  item: 'Verify daemon-bootstrap.js 354L file is properly bundled into all 12 platform exports',
  scope: 'in-spirit',
  reach: 'reachable',
  reason: 'WAVE 1 created daemon-bootstrap.js for skill-driven daemon spawn; must confirm all platform adapters can import and use it'
});

residuals.push({
  category: 'hook-cleanup',
  item: 'Verify hook consolidation (session-start, pre-tool-use, post-tool-use, prompt-submit) is complete and no orphaned hooks remain',
  scope: 'in-spirit',
  reach: 'reachable',
  reason: 'WAVE 1 deleted pre-compact, post-compact, session-end; confirm rs-plugkit reflects the 4-event model and no lingering references exist'
});

residuals.push({
  category: 'documentation',
  item: 'WAVE 3 docs: Update AGENTS.md and skill SKILL.md files with new daemon lifecycle, skill-driven bootstrap, acptoapi spawn behavior, and gm-skill integration pattern',
  scope: 'in-spirit',
  reach: 'reachable',
  reason: 'User mandate documentation updates for functional parity; WAVE 1 and WAVE 2 introduced significant behavioral changes (hooks→skills, daemon-bootstrap, gm-skill scaffold)'
});

console.log('Residuals enumerated:');
residuals.forEach((r, i) => {
  console.log((i + 1) + '. [' + r.category + '] ' + r.item);
  console.log('   Scope: ' + r.scope + ', Reach: ' + r.reach);
  console.log('   Reason: ' + r.reason);
});

console.log('\nResidual scan complete: ' + residuals.length + ' items identified, 0 items out-of-spirit or unreachable');
console.log('All residuals are self-authorized under WAVE 2 scope (functional parity + skill-only build)');
process.exit(0);
