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
  const codexDir = path.join(projectRoot, '.codex', 'plugins', 'gm-codex');
  const sourceDir = __dirname;
  safeCopyDirectory(path.join(sourceDir, 'agents'), path.join(codexDir, 'agents'));
  safeCopyDirectory(path.join(sourceDir, 'scripts'), path.join(codexDir, 'scripts'));
  safeCopyDirectory(path.join(sourceDir, 'skills'), path.join(codexDir, 'skills'));
  safeCopyDirectory(path.join(sourceDir, 'bin'), path.join(codexDir, 'bin'));
  safeCopyDirectory(path.join(sourceDir, '.agents'), path.join(codexDir, '.agents'));
  safeCopyDirectory(path.join(sourceDir, '.codex-plugin'), path.join(codexDir, '.codex-plugin'));
  safeCopyDirectory(path.join(sourceDir, 'assets'), path.join(codexDir, 'assets'));
  try { fs.copyFileSync(path.join(sourceDir, '.mcp.json'), path.join(codexDir, '.mcp.json')); } catch {}
  try { fs.copyFileSync(path.join(sourceDir, '.app.json'), path.join(codexDir, '.app.json')); } catch {}
  try { fs.copyFileSync(path.join(sourceDir, 'plugin.json'), path.join(codexDir, 'plugin.json')); } catch {}
  try { fs.copyFileSync(path.join(sourceDir, 'gm.json'), path.join(codexDir, 'gm.json')); } catch {}
  try { fs.copyFileSync(path.join(sourceDir, 'README.md'), path.join(codexDir, 'README.md')); } catch {}
  try { fs.copyFileSync(path.join(sourceDir, 'CLAUDE.md'), path.join(codexDir, 'CLAUDE.md')); } catch {}
  try { fs.copyFileSync(path.join(sourceDir, 'AGENTS.md'), path.join(codexDir, 'AGENTS.md')); } catch {}

  const SENTINEL_START = '# >>> gm-codex managed (do not edit between sentinels)';
  const SENTINEL_END = '# <<< gm-codex managed';
  const tomlString = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const expand = (cmd, root) => String(cmd).split('${CODEX_PLUGIN_ROOT}').join(root);
  function buildHooksToml(hooksJson, root) {
    const hooks = (hooksJson && hooksJson.hooks) || {};
    const lines = [];
    for (const event of Object.keys(hooks)) {
      for (const group of (hooks[event] || [])) {
        const matcher = group.matcher || '*';
        const entries = group.hooks || [];
        if (!entries.length) continue;
        lines.push('', '[[hooks.' + event + ']]', 'matcher = ' + tomlString(matcher));
        for (const e of entries) {
          lines.push('', '[[hooks.' + event + '.hooks]]');
          lines.push('type = ' + tomlString(e.type || 'command'));
          lines.push('command = ' + tomlString(expand(e.command, root)));
          const t = typeof e.timeout === 'number' ? Math.max(1, Math.round(e.timeout / 1000)) : 60;
          lines.push('timeout = ' + t);
        }
      }
    }
    return lines.join('\n');
  }
  function buildMcpToml(mcpJson) {
    const servers = (mcpJson && mcpJson.mcpServers) || {};
    const lines = [];
    for (const id of Object.keys(servers)) {
      const s = servers[id];
      lines.push('', '[mcp_servers.' + id + ']');
      if (s.command) lines.push('command = ' + tomlString(s.command));
      if (Array.isArray(s.args)) lines.push('args = [' + s.args.map(tomlString).join(', ') + ']');
      if (s.cwd) lines.push('cwd = ' + tomlString(s.cwd));
      if (s.url) lines.push('url = ' + tomlString(s.url));
      if (s.env && typeof s.env === 'object') {
        lines.push('', '[mcp_servers.' + id + '.env]');
        for (const k of Object.keys(s.env)) lines.push(k + ' = ' + tomlString(s.env[k]));
      }
    }
    return lines.join('\n');
  }
  function buildSkillsToml(skillsDir) {
    if (!fs.existsSync(skillsDir)) return '';
    const lines = [];
    for (const ent of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const sp = path.join(skillsDir, ent.name);
      if (!fs.existsSync(path.join(sp, 'SKILL.md'))) continue;
      lines.push('', '[[skills.config]]', 'path = ' + tomlString(sp), 'enabled = true');
    }
    return lines.join('\n');
  }
  function stripManagedBlock(content) {
    if (!content) return '';
    const i = content.indexOf(SENTINEL_START);
    if (i === -1) return content;
    const j = content.indexOf(SENTINEL_END, i);
    if (j === -1) return content;
    return (content.slice(0, i).replace(/\n*$/, '\n') + content.slice(j + SENTINEL_END.length).replace(/^\n+/, '')).replace(/\n{3,}/g, '\n\n');
  }
  function buildBlock(root) {
    const hooksJson = fs.existsSync(path.join(root, 'hooks', 'hooks.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'hooks', 'hooks.json'), 'utf8')) : { hooks: {} };
    const mcpJson = fs.existsSync(path.join(root, '.mcp.json')) ? JSON.parse(fs.readFileSync(path.join(root, '.mcp.json'), 'utf8')) : { mcpServers: {} };
    const parts = [SENTINEL_START, '', '[features]', 'codex_hooks = true', buildHooksToml(hooksJson, root), buildMcpToml(mcpJson), buildSkillsToml(path.join(root, 'skills')), '', SENTINEL_END];
    return parts.filter(p => p !== '').join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  }
  function mergeCodexToml(configPath, root) {
    const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
    const stripped = stripManagedBlock(existing).replace(/\s+$/, '');
    const block = buildBlock(root);
    const next = stripped ? stripped + '\n\n' + block : block;
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, next);
  }
  try {
    mergeCodexToml(path.join(projectRoot, '.codex', 'config.toml'), codexDir);
    console.log('✓ wired ~/.codex/config.toml (managed block)');
  } catch (e) {
    console.warn('Warning: failed to wire codex config.toml:', e.message);
  }

}

install();
