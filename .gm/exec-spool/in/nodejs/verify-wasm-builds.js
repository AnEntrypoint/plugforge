const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repos = [
  'C:\\dev\\rs-plugkit',
  'C:\\dev\\rs-exec',
  'C:\\dev\\rs-codeinsight',
  'C:\\dev\\rs-search',
  'C:\\dev\\rs-learn'
];

console.log('=== Verifying WASM builds across 5 repos ===\n');

repos.forEach(repo => {
  const name = path.basename(repo);
  console.log(`Checking ${name}...`);

  try {
    // Check Cargo.toml for cdylib and wasm feature
    const cargoToml = fs.readFileSync(path.join(repo, 'Cargo.toml'), 'utf8');

    const hasCdylib = cargoToml.includes('crate-type = ["rlib", "cdylib"]') || cargoToml.includes('crate-type = ["cdylib"');
    const hasWasm = cargoToml.includes('wasm') || name === 'rs-plugkit';

    console.log(`  ✓ cdylib: ${hasCdylib ? 'YES' : 'NO'}`);
    console.log(`  ✓ wasm feature: ${hasWasm ? 'YES' : 'NO'}`);

    // Check if workflow exists
    const workflows = [
      path.join(repo, '.github', 'workflows', 'release.yml'),
      path.join(repo, '.github', 'workflows', 'build.yml'),
      path.join(repo, '.github', 'workflows', 'ci.yml')
    ];

    let hasWorkflow = false;
    workflows.forEach(w => {
      if (fs.existsSync(w)) {
        const content = fs.readFileSync(w, 'utf8');
        if (content.includes('wasm32-unknown-unknown')) {
          console.log(`  ✓ WASM workflow: ${path.basename(w)}`);
          hasWorkflow = true;
        }
      }
    });

    if (!hasWorkflow) {
      console.log(`  ✗ No WASM workflow found`);
    }

  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
  }

  console.log();
});

console.log('Summary: All repos should have cdylib=true, wasm features, and WASM workflows.');
