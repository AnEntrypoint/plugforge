const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const gcPath = '/c/dev/gm-gc';
  if (!fs.existsSync(gcPath)) {
    console.log(JSON.stringify({ exists: false, status: 'gm-gc repo not cloned' }, null, 2));
    process.exit(0);
  }

  const packageJsonPath = path.join(gcPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log(JSON.stringify({ exists: false, status: 'gm-gc exists but no package.json' }, null, 2));
    process.exit(0);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const providerConfig = {
    name: packageJson.name,
    version: packageJson.version,
    dependencies: Object.keys(packageJson.dependencies || {}),
    has_gemini: !!packageJson.dependencies?.('@google/generative-ai' || 'google-generative-ai'),
    has_anthropic: !!packageJson.dependencies?.('@anthropic-ai/sdk' || 'anthropic'),
    has_gm_skill: !!packageJson.devDependencies?.('gm-skill')
  };

  console.log(JSON.stringify(providerConfig, null, 2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
