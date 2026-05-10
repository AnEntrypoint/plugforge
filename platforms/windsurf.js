const ExtensionAdapter = require('../lib/extension-adapter');
const { windsurfManifest } = require('./ide-manifests');
const TemplateBuilder = require('../lib/template-builder');

class WindsurfAdapter extends ExtensionAdapter {
  constructor() {
    super({
      name: 'windsurf',
      label: 'Windsurf IDE',
      configFile: 'package.json',
      manifestType: 'windsurf'
    });
  }

  createFileStructure(pluginSpec, sourceDir) {
    const readFile = (paths) => this.readSourceFile(sourceDir, paths);
    const structure = {
      'package.json': this.generatePackageJson(pluginSpec),
      '.windsurf/mcp.json': this.generateWindsurfMcp(pluginSpec),
      '.windsurfrules': this.generateWindsurfRules(),
      'extension.js': this.generateExtensionEntry(),
      'agents/gm.md': readFile(this.getAgentSourcePaths('gm')),
      'agents/codesearch.md': readFile(this.getAgentSourcePaths('codesearch')),
      'agents/websearch.md': readFile(this.getAgentSourcePaths('websearch')),
      'README.md': this.generateReadme(),
      'index.html': TemplateBuilder.generateGitHubPage(TemplateBuilder.getPlatformPageConfig('windsurf', pluginSpec))
    };
    const skills = this.loadSkillsFromSource(sourceDir);
    Object.assign(structure, skills);
    return structure;
  }

  loadSkillsFromSource(sourceDir) {
    return TemplateBuilder.loadSkillsFromSource(sourceDir, 'skills');
  }

  generatePackageJson(pluginSpec) {
    const manifest = JSON.parse(windsurfManifest(pluginSpec));
    manifest.main = './extension.js';
    manifest.files = ['.windsurf/', 'extension.js', 'agents/', 'skills/', '.github/', 'README.md'];
    return JSON.stringify(manifest, null, 2);
  }

  generateWindsurfMcp(pluginSpec) {
    return JSON.stringify({
      mcpServers: pluginSpec.mcp || {}
    }, null, 2);
  }

  generateWindsurfRules() {
    return `# Windsurf Agent Rules

Follow these patterns for Windsurf IDE integrations.

## Tool Usage
- Use windsurf.extensions.* APIs for integration
- Register hooks in extension manifest
- Activate on workbench ready

## Agent Pattern
- Load agents from agents/
- Initialize on startup

## Semantic Code Search

Your editor uses semantic code search to understand intent, not just syntax patterns.

### How It Works
- Intent-based: describe what you are looking for in plain language
- Cross-file understanding: finds related code patterns regardless of implementation details

### When to Use Code Search
- Exploring unfamiliar codebases
- Finding similar patterns
- Understanding how components integrate
- Locating where features are implemented
`;
  }

  generateExtensionEntry() {
    return `const vscode = require('vscode');

let agents = {};

async function activate(context) {
  console.log('Windsurf extension activated');

  try {
    const gm = require('./gm.md');
    const codesearch = require('./codesearch.md');
    const websearch = require('./websearch.md');

    agents = { gm, codesearch, websearch };
    context.subscriptions.push(
      vscode.commands.registerCommand('windsurf.showAgents', () => {
        console.log('Available agents:', Object.keys(agents));
      })
    );
  } catch (e) {
    console.error('Failed to activate Windsurf extension:', e);
  }
}

function deactivate() {
  console.log('Windsurf extension deactivated');
}

module.exports = { activate, deactivate };
`;
  }

  generateReadme() {
    return `# GM Extension for Windsurf IDE

Custom AI plugin for Windsurf IDE (Codeium) with multi-platform support.

## Installation

1. Copy extension to .windsurf/extensions/
2. Restart Windsurf IDE
3. Extension activates automatically

## Features

- Custom agent definitions
- Integrated MCP support
- Session management

## Configuration

Edit .windsurf/mcp.json to configure MCP servers.
`;
  }
}

module.exports = WindsurfAdapter;
