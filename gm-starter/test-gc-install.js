const fs = require('fs');
const path = require('path');

async function testGeminiInstall() {
  const installDir = path.join(process.env.GEMINI_PROJECT_DIR || process.env.HOME || process.env.USERPROFILE, '.gemini', 'extensions', 'gm');
  
  console.log('Testing gm-gc npm install...');
  console.log(`Expected installation path: ${installDir}`);
  
  const checks = {
    'skills/gm/SKILL.md': path.join(installDir, 'skills', 'gm', 'SKILL.md'),
    'bin/bootstrap.js': path.join(installDir, 'bin', 'bootstrap.js'),
    'scripts/': path.join(installDir, 'scripts'),
    'prompts/': path.join(installDir, 'prompts'),
    'hooks/hooks.json': path.join(installDir, 'hooks', 'hooks.json'),
    'AGENTS.md': path.join(installDir, 'AGENTS.md'),
    'GEMINI.md': path.join(installDir, 'GEMINI.md'),
  };
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, location] of Object.entries(checks)) {
    if (fs.existsSync(location)) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name} (not found at ${location})`);
      failed++;
    }
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
  
  console.log('✓ All checks passed');
}

testGeminiInstall().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
