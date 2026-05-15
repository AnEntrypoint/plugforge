#!/usr/bin/env node
'use strict';

const gm = require('./lib/index.js');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('=== gm-skill Integration Test ===\n');

  const tests = [];
  let passed = 0;
  let failed = 0;

  const test = (name, fn) => tests.push({ name, fn });

  test('rs-plugkit.version', async () => {
    const ver = require('child_process').spawnSync('node', [path.join(__dirname, 'bin', 'rs-plugkit.js'), 'version'], {
      encoding: 'utf8'
    });
    if (ver.stdout.trim().match(/^\d+\.\d+\.\d+$/)) return true;
    throw new Error('Invalid version format: ' + ver.stdout);
  });

  test('rs-plugkit.where', async () => {
    const bin = require('child_process').spawnSync('node', [path.join(__dirname, 'bin', 'rs-plugkit.js'), 'where'], {
      encoding: 'utf8'
    });
    const binPath = bin.stdout.trim();
    if (!binPath) throw new Error('No binary path returned');
    return true;
  });

  test('Manifest loads all 24 skills', async () => {
    const skills = gm.manifest.getAllSkills();
    if (skills.length !== 24) throw new Error(`Expected 24 skills, got ${skills.length}`);
    return true;
  });

  test('Core skills resolve', async () => {
    const names = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete', 'update-docs'];
    for (const name of names) {
      const skill = gm.loader.resolveSkill(name);
      if (!skill) throw new Error(`Could not resolve ${name}`);
    }
    return true;
  });

  test('Platform skills load', async () => {
    const names = ['gm-cc', 'gm-gc', 'gm-oc', 'gm-kilo', 'gm-codex', 'gm-copilot-cli', 'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains'];
    for (const name of names) {
      const skill = gm.loader.resolveSkill(name);
      if (!skill || !skill.execute) throw new Error(`${name} missing execute function`);
    }
    return true;
  });

  test('Utility skills load', async () => {
    const names = ['code-search', 'browser', 'ssh', 'pages', 'governance', 'create-lang-plugin', 'textprocessing', 'research'];
    for (const name of names) {
      const skill = gm.loader.resolveSkill(name);
      if (!skill) throw new Error(`Could not resolve ${name}`);
    }
    return true;
  });

  test('Spool module exports', async () => {
    if (!gm.spool.writeSpool) throw new Error('writeSpool missing');
    if (!gm.spool.readSpoolOutput) throw new Error('readSpoolOutput missing');
    if (!gm.spool.waitForCompletion) throw new Error('waitForCompletion missing');
    return true;
  });

  test('Hook bridge exports', async () => {
    if (!gm.hooks.runHook) throw new Error('runHook missing');
    if (!gm.hooks.startWatcher) throw new Error('startWatcher missing');
    if (!gm.hooks.ensurePlugkit) throw new Error('ensurePlugkit missing');
    return true;
  });

  test('Hook replacer exports', async () => {
    if (!gm.hookReplacer.startSpoolWatcher) throw new Error('startSpoolWatcher missing');
    if (!gm.hookReplacer.ensurePlugkitBinary) throw new Error('ensurePlugkitBinary missing');
    return true;
  });

  test('Daemon bootstrap exports', async () => {
    if (!gm.checkState) throw new Error('checkState missing');
    if (!gm.bootstrapDaemon) throw new Error('bootstrapDaemon missing');
    if (!gm.waitForReady) throw new Error('waitForReady missing');
    return true;
  });

  console.log(`Running ${tests.length} tests...\n`);

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

runTests().then(code => process.exit(code)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
