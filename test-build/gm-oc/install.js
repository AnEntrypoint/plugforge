#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function isInsideNodeModules() {
  return __dirname.includes(path.sep + 'node_modules' + path.sep);
}

function getProjectRoot() {
  if (!isInsideNodeModules()) return null;
  let current = __dirname;
  while (current !== path.dirname(current)) {
    current = path.dirname(current);
    if (path.basename(current) === 'node_modules') return path.dirname(current);
  }
  return null;
}

function safeCopyDirectory(src, dst) {
  try {
    if (!fs.existsSync(src)) return false;
    fs.mkdirSync(dst, { recursive: true });
    fs.readdirSync(src, { withFileTypes: true }).forEach(entry => {
      const s = path.join(src, entry.name), d = path.join(dst, entry.name);
      if (entry.isDirectory()) safeCopyDirectory(s, d);
      else { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); try { fs.chmodSync(d, fs.statSync(s).mode); } catch (e) {} }
    });
    return true;
  } catch (e) { return false; }
}

function install() {
  if (!isInsideNodeModules()) return;
  const projectRoot = getProjectRoot();
  if (!projectRoot) return;
  const ocDir = path.join(projectRoot, '.opencode', 'plugins', 'gm-oc');
  const sourceDir = __dirname;
  safeCopyDirectory(path.join(sourceDir, 'agents'), path.join(ocDir, 'agents'));
  safeCopyDirectory(path.join(sourceDir, 'bin'), path.join(ocDir, 'bin'));
  safeCopyDirectory(path.join(sourceDir, 'skills'), path.join(ocDir, 'skills'));
  safeCopyDirectory(path.join(sourceDir, 'lang'), path.join(ocDir, 'lang'));
  safeCopyDirectory(path.join(sourceDir, 'scripts'), path.join(ocDir, 'scripts'));
}

install();
