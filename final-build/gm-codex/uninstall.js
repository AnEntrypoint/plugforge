#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();
const pluginDir = path.join(homeDir, '.codex', 'plugins', 'gm-codex');
const configPath = path.join(homeDir, '.codex', 'config.toml');
const SENTINEL_START = '# >>> gm-codex managed (do not edit between sentinels)';
const SENTINEL_END = '# <<< gm-codex managed';

function stripManagedBlock(content) {
  if (!content) return '';
  const i = content.indexOf(SENTINEL_START);
  if (i === -1) return content;
  const j = content.indexOf(SENTINEL_END, i);
  if (j === -1) return content;
  return (content.slice(0, i).replace(/\n*$/, '\n') + content.slice(j + SENTINEL_END.length).replace(/^\n+/, '')).replace(/\n{3,}/g, '\n\n');
}

try {
  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
    console.log('✓ removed ' + pluginDir);
  }
  if (fs.existsSync(configPath)) {
    const before = fs.readFileSync(configPath, 'utf8');
    const after = stripManagedBlock(before);
    if (after !== before) {
      if (after.trim() === '') {
        fs.unlinkSync(configPath);
        console.log('✓ removed empty ' + configPath);
      } else {
        fs.writeFileSync(configPath, after);
        console.log('✓ stripped managed block from ' + configPath);
      }
    }
  }
  console.log('gm-codex uninstalled.');
} catch (e) {
  console.error('Uninstall failed:', e.message);
  process.exit(1);
}
