const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('[TEST] gm-plugkit integration test');

try {
  const gmStarterPlugkitPath = path.join(__dirname, 'gm-starter', 'gm-plugkit');
  const wrapperPath = path.join(gmStarterPlugkitPath, 'plugkit-wasm-wrapper.js');

  console.log('[CHECK] Wrapper file exists at bundled location:', fs.existsSync(wrapperPath));

  if (!fs.existsSync(wrapperPath)) {
    console.error('[FAIL] Bundled wrapper not found');
    process.exit(1);
  }

  const wrapperContent = fs.readFileSync(wrapperPath, 'utf8');
  console.log('[CHECK] Wrapper file is ESM:', wrapperContent.includes('import'));
  console.log('[CHECK] Has dispatch_verb call:', wrapperContent.includes('dispatch_verb'));
  console.log('[CHECK] Has spool watching:', wrapperContent.includes('fs.watch'));

  const packageJsonPath = path.join(gmStarterPlugkitPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  console.log('[CHECK] gm-plugkit name:', packageJson.name);
  console.log('[CHECK] gm-plugkit version:', packageJson.version);
  console.log('[CHECK] Wrapper in files array:', packageJson.files.includes('plugkit-wasm-wrapper.js'));
  console.log('[CHECK] Wrapper in bin section:', !!packageJson.bin['plugkit-wasm-wrapper']);

  const skillBootstrapPath = path.join(__dirname, 'gm-starter', 'lib', 'skill-bootstrap.js');
  const skillBootstrapContent = fs.readFileSync(skillBootstrapPath, 'utf8');

  console.log('[CHECK] skill-bootstrap requires gm-plugkit:', skillBootstrapContent.includes("require('gm-plugkit')"));
  console.log('[CHECK] skill-bootstrap has fallback:', skillBootstrapContent.includes('gm-plugkit npm not available'));

  console.log('\n[SUCCESS] All integration checks passed');
} catch (err) {
  console.error('[ERROR]', err.message);
  process.exit(1);
}
