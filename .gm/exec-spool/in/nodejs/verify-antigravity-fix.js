const AntigravityAdapter = require('../../platforms/antigravity');
const path = require('path');
const fs = require('fs');

try {
  const adapter = new AntigravityAdapter();
  const sourceDir = path.join(process.cwd(), 'gm-starter');
  const pluginSpec = {
    name: 'gm',
    version: '2.0.0',
    description: 'GM State Machine',
    author: 'AnEntrypoint'
  };

  const structure = adapter.createFileStructure(pluginSpec, sourceDir);
  const skillPaths = Object.keys(structure)
    .filter(k => k.startsWith('skills/'))
    .sort();

  console.log('=== ANTIGRAVITY SKILLS ===');
  console.log(`Total skills: ${skillPaths.length}\n`);
  skillPaths.forEach(s => console.log(`✓ ${s}`));

  // Check for unwanted platform skills
  const forbidden = skillPaths.filter(s =>
    /gm-(cc|gc|oc|kilo|codex|copilot|vscode|cursor|zed|jetbrains)/.test(s)
  );

  if (forbidden.length > 0) {
    console.error('\n❌ ERROR: Found platform orchestration skills (should be removed):');
    forbidden.forEach(s => console.error(`  ${s}`));
    process.exit(1);
  }

  // Check for non-existent agents
  const agents = Object.keys(structure)
    .filter(k => k.startsWith('agents/'))
    .sort();

  console.log('\n=== AGENTS ===');
  agents.forEach(a => console.log(`✓ ${a}`));

  if (agents.includes('agents/codesearch.md') || agents.includes('agents/websearch.md')) {
    console.error('\n❌ ERROR: Found non-gm agents (should be removed):');
    if (agents.includes('agents/codesearch.md')) console.error('  agents/codesearch.md');
    if (agents.includes('agents/websearch.md')) console.error('  agents/websearch.md');
    process.exit(1);
  }

  console.log('\n✅ All checks passed!');
  console.log('  - Only gm agent included');
  console.log('  - Platform orchestration skills filtered out');
  console.log('  - Ready for packaging');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
