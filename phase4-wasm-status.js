#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RUST_REPOS = [
  '/c/dev/rs-plugkit',
  '/c/dev/rs-exec',
  '/c/dev/rs-codeinsight',
  '/c/dev/rs-search',
  '/c/dev/rs-learn'
];

console.log('=== Phase 4: WASM Build Status ===\n');

const results = [];

RUST_REPOS.forEach(repoPath => {
  const repoName = path.basename(repoPath);

  if (!fs.existsSync(repoPath)) {
    results.push({ repo: repoName, status: '❌ NOT FOUND' });
    return;
  }

  try {
    const cargoToml = fs.readFileSync(path.join(repoPath, 'Cargo.toml'), 'utf8');
    const hasWasmFeature = cargoToml.includes('wasm = []');
    const hasWasmTarget = cargoToml.includes('wasm32');

    let releaseWorkflow = null;
    const releaseYmlPath = path.join(repoPath, '.github/workflows/release.yml');
    if (fs.existsSync(releaseYmlPath)) {
      const releaseContent = fs.readFileSync(releaseYmlPath, 'utf8');
      releaseWorkflow = {
        buildsWasm: releaseContent.includes('wasm32-unknown-unknown'),
        publishes: releaseContent.includes('upload-artifact') || releaseContent.includes('release'),
      };
    }

    const wasmYmlPath = path.join(repoPath, '.github/workflows/wasm.yml');
    const hasWasmYml = fs.existsSync(wasmYmlPath);

    const buildYmlPath = path.join(repoPath, '.github/workflows/build.yml');
    const hasBuildYml = fs.existsSync(buildYmlPath);

    let status = '✅';
    const details = [];

    if (hasWasmFeature) details.push('has wasm feature');
    if (hasWasmTarget) details.push('has wasm32 config');
    if (releaseWorkflow?.buildsWasm) details.push('release builds WASM');
    if (releaseWorkflow?.publishes) details.push('publishes binaries');
    if (hasWasmYml) details.push('has wasm.yml');
    if (hasBuildYml) details.push('has build.yml');

    const missing = [];
    if (!hasWasmFeature) { missing.push('wasm feature'); status = '⚠️'; }
    if (!releaseWorkflow?.buildsWasm) { missing.push('WASM build in release'); status = '⚠️'; }

    results.push({
      repo: repoName,
      status: status,
      details: details.join(', '),
      missing: missing.length > 0 ? missing.join(', ') : null
    });
  } catch (e) {
    results.push({ repo: repoName, status: '❌ ERROR', error: e.message });
  }
});

results.forEach(r => {
  console.log(`${r.status} ${r.repo.padEnd(20)}`);
  if (r.details) console.log(`   ├─ ${r.details}`);
  if (r.missing) console.log(`   └─ MISSING: ${r.missing}`);
  if (r.error) console.log(`   └─ ERROR: ${r.error}`);
});

console.log('\n=== Summary ===\n');

const allOk = results.every(r => r.status === '✅');
const allConfigured = results.every(r => r.status === '✅' || r.status === '⚠️');

if (allOk) {
  console.log('✅ ALL REPOS WASM-CONFIGURED');
  console.log('\nAll 5 Rust repos are ready for WASM-only builds.');
} else if (allConfigured) {
  console.log('⚠️ MOSTLY WASM-CONFIGURED');
  console.log('\nSome repos may need release.yml updates.');
} else {
  console.log('❌ SOME REPOS NEED UPDATES');
}

console.log('\nTo complete Phase 4:');
console.log('1. Verify all repos build WASM in CI/CD');
console.log('2. Confirm bootstrap.js fetches WASM binaries');
console.log('3. Test WASM binaries across all 15 downstream platforms');
