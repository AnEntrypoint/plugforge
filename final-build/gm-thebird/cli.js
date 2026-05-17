#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();
const destDir = path.join(homeDir, '.freddie', 'plugins', 'gm-thebird');
const srcDir = __dirname;
const isUpgrade = fs.existsSync(destDir);

console.log(isUpgrade ? 'Upgrading gm-thebird...' : 'Installing gm-thebird...');

function copyRecursive(src, dst) {
    if (!fs.existsSync(src)) return;
    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      fs.readdirSync(src).forEach(f => copyRecursive(path.join(src, f), path.join(dst, f)));
    } else {
      fs.copyFileSync(src, dst);
    }
  }

function downloadPlugkitWasm(version, target) {
  return new Promise((resolve, reject) => {
    const url = 'https://github.com/AnEntrypoint/plugkit-bin/releases/download/v' + version + '/plugkit.wasm';
    function get(u, redirectsLeft) {
      https.get(u, { headers: { 'User-Agent': 'gm-thebird-installer' } }, res => {
        if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
          return get(res.headers.location, redirectsLeft - 1);
        }
        if (res.statusCode !== 200) { reject(new Error('plugkit.wasm fetch failed: HTTP ' + res.statusCode)); return; }
        const out = fs.createWriteStream(target);
        res.pipe(out);
        out.on('finish', () => out.close(resolve));
        out.on('error', reject);
      }).on('error', reject);
    }
    get(url, 5);
  });
}

(async () => {
  try {
    fs.mkdirSync(destDir, { recursive: true });
    fs.mkdirSync(path.join(destDir, 'bin'), { recursive: true });
    copyRecursive(path.join(srcDir, 'agents'), path.join(destDir, 'agents'));
    copyRecursive(path.join(srcDir, 'hooks'), path.join(destDir, 'hooks'));
    copyRecursive(path.join(srcDir, 'skills'), path.join(destDir, 'skills'));
    try { fs.copyFileSync(path.join(srcDir, 'plugin.json'), path.join(destDir, 'plugin.json')); } catch {}
    try { fs.copyFileSync(path.join(srcDir, 'gm.json'), path.join(destDir, 'gm.json')); } catch {}
    try { fs.copyFileSync(path.join(srcDir, 'README.md'), path.join(destDir, 'README.md')); } catch {}

    const version = fs.readFileSync(path.join(srcDir, 'bin', 'plugkit.version'), 'utf-8').trim();
    const wasmTarget = path.join(destDir, 'bin', 'plugkit.wasm');
    if (!fs.existsSync(wasmTarget)) {
      console.log('Fetching plugkit.wasm v' + version + '...');
      await downloadPlugkitWasm(version, wasmTarget);
    }
    fs.writeFileSync(path.join(destDir, 'bin', 'plugkit.version'), version);

    console.log('✓ gm-thebird ' + (isUpgrade ? 'upgraded' : 'installed') + ' to ' + destDir);
    console.log('Restart Freddie to load the plugin.');
  } catch (e) {
    console.error('Installation failed:', e.message);
    process.exit(1);
  }
})();
