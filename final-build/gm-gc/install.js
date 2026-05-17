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
   if (!isInsideNodeModules()) {
     process.stderr.write('[gm-gc-install] not in node_modules context, skipping\n');
     return;
   }
   const projectRoot = getProjectRoot();
   if (!projectRoot) {
     process.stderr.write('[gm-gc-install] could not resolve project root\n');
     return;
   }
   const geminiDir = path.join(projectRoot, '.gemini', 'extensions', 'gm');
   const sourceDir = __dirname;
   process.stderr.write(`[gm-gc-install] destination: ${geminiDir}\n`);
   const agentsOk = safeCopyDirectory(path.join(sourceDir, 'agents'), path.join(geminiDir, 'agents'));
   process.stderr.write(`[gm-gc-install] agents: ${agentsOk ? 'ok' : 'failed'}\n`);
   const skillsOk = safeCopyDirectory(path.join(sourceDir, 'skills'), path.join(geminiDir, 'skills'));
   process.stderr.write(`[gm-gc-install] skills: ${skillsOk ? 'ok' : 'failed'}\n`);
   const scriptsOk = safeCopyDirectory(path.join(sourceDir, 'scripts'), path.join(geminiDir, 'scripts'));
   process.stderr.write(`[gm-gc-install] scripts: ${scriptsOk ? 'ok' : 'failed'}\n`);
   const binOk = safeCopyDirectory(path.join(sourceDir, 'bin'), path.join(geminiDir, 'bin'));
   process.stderr.write(`[gm-gc-install] bin: ${binOk ? 'ok' : 'failed'}\n`);
   ['AGENTS.md', 'prompts'].forEach(f => {
     try { fs.copyFileSync(path.join(sourceDir, f), path.join(geminiDir, f)); } catch {}
   });
 }

 install();
 