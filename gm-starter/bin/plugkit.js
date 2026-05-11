#!/usr/bin/env node
'use strict';
// Minimal exec wrapper. ZERO bootstrap, ZERO version-probe, ZERO async work.
// Just shell out to ~/.claude/gm-tools/plugkit{.exe} with inherited stdio.
// The Rust binary handles its own self-update at startup (detached); first-time
// bootstrap is done by gm-cc postinstall.js. Hot path is one spawnSync, ~150ms
// of node startup overhead.

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function toolsBin() {
  const home = process.env.USERPROFILE || process.env.HOME || os.homedir();
  const exe = process.platform === 'win32' ? 'plugkit.exe' : 'plugkit';
  return path.join(home, '.claude', 'gm-tools', exe);
}

function legacyBesideWrapper() {
  const dir = __dirname;
  const p = os.platform();
  const a = os.arch();
  let candidates = [];
  if (p === 'win32') candidates = [path.join(dir, a === 'arm64' ? 'plugkit-win32-arm64.exe' : 'plugkit-win32-x64.exe')];
  else if (p === 'darwin') candidates = [path.join(dir, a === 'arm64' ? 'plugkit-darwin-arm64' : 'plugkit-darwin-x64')];
  else candidates = [path.join(dir, (a === 'arm64' || a === 'aarch64') ? 'plugkit-linux-arm64' : 'plugkit-linux-x64')];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

function main() {
  const args = process.argv.slice(2);
  const isHook = args[0] === 'hook';
  let bin = toolsBin();
  if (!fs.existsSync(bin)) {
    bin = legacyBesideWrapper();
    if (!bin) {
      // Binary not yet installed. If this is a hook, exit cleanly so CC doesn't
      // see an error; postinstall will populate gm-tools on /plugin install.
      if (isHook) process.exit(0);
      process.stderr.write('[plugkit] binary not found at ~/.claude/gm-tools/plugkit — run postinstall\n');
      process.exit(1);
    }
  }
  const r = spawnSync(bin, args, { stdio: 'inherit', windowsHide: true });
  process.exit(r.status ?? 1);
}

main();
