#!/usr/bin/env node
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const dir = __dirname;
const platform = os.platform();
const arch = os.arch();

let src;
if (platform === 'win32') {
  src = path.join(dir, arch === 'arm64' ? 'plugkit-win32-arm64.exe' : 'plugkit-win32-x64.exe');
  if (!fs.existsSync(src)) src = path.join(dir, 'plugkit.exe');
} else if (platform === 'darwin') {
  src = path.join(dir, arch === 'arm64' ? 'plugkit-darwin-arm64' : 'plugkit-darwin-x64');
} else {
  src = path.join(dir, arch === 'arm64' || arch === 'aarch64' ? 'plugkit-linux-arm64' : 'plugkit-linux-x64');
}

function hashFile(p) {
  try {
    const buf = fs.readFileSync(p);
    return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
  } catch { return null; }
}

const cacheDir = path.join(os.homedir(), '.plugkit-cache');
try { fs.mkdirSync(cacheDir, { recursive: true }); } catch {}

const ext = platform === 'win32' ? '.exe' : '';
const hash = hashFile(src);
const cached = path.join(cacheDir, `plugkit-${hash}${ext}`);

if (hash && !fs.existsSync(cached)) {
  try { fs.copyFileSync(src, cached); if (platform !== 'win32') fs.chmodSync(cached, 0o755); } catch {}
}

const bin = (hash && fs.existsSync(cached)) ? cached : src;
const result = spawnSync(bin, process.argv.slice(2), { stdio: 'inherit' });
process.exit(result.status ?? 1);
