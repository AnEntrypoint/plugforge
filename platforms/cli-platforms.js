const CLIAdapter = require('../lib/cli-adapter');

const config = [
  {
    name: 'cc',
    label: 'Claude Code',
    configFile: 'plugin.json',
    contextFile: 'CLAUDE.md',
    hookEventNames: {
      sessionStart: 'SessionStart',
      preTool: 'PreToolUse',
      promptSubmit: 'UserPromptSubmit',
      stop: 'Stop',
      stopGit: 'Stop'
    },
    hookOutputFormat: 'wrapped',
    tools: {
      bash: 'Bash',
      write: 'Write',
      glob: 'Glob',
      grep: 'Grep',
      search: 'Search'
    },
    env: {
      pluginRoot: 'CLAUDE_PLUGIN_ROOT',
      projectDir: 'CLAUDE_PROJECT_DIR'
    },
    formatConfigJson(config) {
      return JSON.stringify({
        ...config,
        author: {
          name: config.author,
          url: 'https://github.com/AnEntrypoint'
        },
        hooks: './hooks/hooks.json'
      }, null, 2);
    },
    getPackageJsonMain() {
      return '.claude-plugin/plugin.json';
    },
    getPackageJsonFields() {
      return {
        main: '.claude-plugin/plugin.json',
        bin: { 'glootie-cc': './cli.js' },
        files: [
          '.claude-plugin/',
          'hooks/',
          'README.md',
          'CLAUDE.md',
          '.mcp.json',
          'plugin.json',
          'prompt-submit-hook.js',
          'stop-hook.js'
        ],
        keywords: [
          'claude-code',
          'claude-plugin',
          'wfgy',
          'mcp',
          'automation',
          'glootie'
        ],
        peerDependencies: { '@anthropic-ai/claude-code': '*' }
      };
    },
    getAdditionalFiles() {
      return {
        '.claude-plugin/marketplace.json': JSON.stringify({
          name: arguments[0].name,
          version: arguments[0].version,
          description: arguments[0].description
        }, null, 2)
      };
    }
  },
  {
    name: 'gc',
    label: 'Gemini CLI',
    configFile: 'gemini-extension.json',
    contextFile: 'GEMINI.md',
    hookEventNames: {
      sessionStart: 'SessionStart',
      preTool: 'BeforeTool',
      promptSubmit: 'BeforeAgent',
      stop: 'SessionEnd',
      stopGit: 'SessionEnd'
    },
    hookOutputFormat: 'bare',
    tools: {
      bash: 'run_shell_command',
      write: 'write_file',
      glob: 'glob',
      grep: 'search_file_content',
      search: 'search'
    },
    env: {
      pluginRoot: 'GEMINI_PROJECT_DIR',
      projectDir: 'GEMINI_PROJECT_DIR'
    },
    formatConfigJson(config) {
      return JSON.stringify({
        ...config,
        contextFileName: this.contextFile
      }, null, 2);
    },
    getPackageJsonFields() {
      return {
        files: [
          'agents/',
          'hooks/',
          'README.md',
          'GEMINI.md',
          '.mcp.json',
          'gemini-extension.json',
          'cli.js',
          'pre-tool-use-hook.js',
          'session-start-hook.js',
          'prompt-submit-hook.js',
          'stop-hook.js',
          'stop-hook-git.js'
        ]
      };
    },
    getAdditionalFiles(pluginSpec, readFile) {
      return {
        'cli.js': `#!/usr/bin/env node

const show = () => {
  console.log('glootie-gc: Advanced Gemini CLI extension');
  console.log('Version: 2.0.9');
  console.log('');
  console.log('Usage: glootie-gc [command]');
  console.log('Commands:');
  console.log('  help, --help, -h');
  console.log('  version, --version');
};

const args = process.argv.slice(2);
if (!args.length || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
  show();
} else if (args[0] === 'version' || args[0] === '--version') {
  console.log('2.0.9');
}
`
      };
    }
  },
  {
    name: 'oc',
    label: 'OpenCode',
    configFile: 'opencode.json',
    contextFile: 'GLOOTIE.md',
    hookEventNames: {
      sessionStart: 'session.created',
      preTool: 'tool.execute.before',
      promptSubmit: 'message.updated',
      stop: 'session.closing',
      stopGit: 'session.closing'
    },
    hookOutputFormat: 'sdk',
    tools: {
      bash: 'spawn/exec',
      write: 'fs.writeFile',
      glob: 'fs.glob',
      grep: 'grep',
      search: 'search'
    },
    env: {
      pluginRoot: 'OC_PLUGIN_ROOT',
      projectDir: 'OC_PROJECT_DIR'
    },
    getPackageJsonFields() {
      return {
        main: 'index.js',
        files: [
          'agents/',
          'hooks/',
          'index.js',
          'opencode.json',
          '.mcp.json',
          'setup.sh',
          'setup.bat',
          'setup-global.js',
          'install-global.sh',
          'install-global.bat'
        ]
      };
    },
    formatConfigJson(config, pluginSpec) {
      return JSON.stringify({
        $schema: 'https://opencode.ai/config.json',
        default_agent: 'gm',
        plugin: {
          name: pluginSpec.name,
          module: './index.js'
        },
        mcp: {
          dev: {
            type: 'local',
            command: ['npx', '-y', 'gxe@latest', 'AnEntrypoint/mcp-glootie'],
            timeout: 360000,
            enabled: true
          },
          'code-search': {
            type: 'local',
            command: ['npx', '-y', 'gxe@latest', 'AnEntrypoint/code-search'],
            timeout: 360000,
            enabled: true
          }
        }
      }, null, 2);
    },
    getAdditionalFiles(pluginSpec, readFile) {
      return {
        'index.js': readFile(['glootie-oc/index.js']),
        'setup.sh': `#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
mkdir -p "$SCRIPT_DIR/.opencode/agents"
mkdir -p "$SCRIPT_DIR/.opencode/plugins"
cp "$SCRIPT_DIR/agents/gm.md" "$SCRIPT_DIR/.opencode/agents/" 2>/dev/null || true
npm install --save-dev 2>/dev/null || true
echo "Setup complete!"
`,
        'setup.bat': `@echo off
setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0
if not exist "%SCRIPT_DIR%.opencode" mkdir "%SCRIPT_DIR%.opencode"
if not exist "%SCRIPT_DIR%.opencode\\agents" mkdir "%SCRIPT_DIR%.opencode\\agents"
copy "%SCRIPT_DIR%agents\\gm.md" "%SCRIPT_DIR%.opencode\\agents\\" >nul 2>&1 || true
call npm install --save-dev >nul 2>&1 || true
echo Setup complete!
`,
        'setup-global.js': readFile(['glootie-oc/setup-global.js']),
        'install-global.sh': `#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
OPENCODE_CONFIG_DIR="\${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
mkdir -p "$OPENCODE_CONFIG_DIR/plugins"
cp -r "$SCRIPT_DIR" "$OPENCODE_CONFIG_DIR/plugins/glootie"
echo "Global installation complete!"
`,
        'install-global.bat': `@echo off
setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0
if "%APPDATA%"=="" (
    echo Error: APPDATA not set
    exit /b 1
)
set OPENCODE_CONFIG_DIR=%APPDATA%\\opencode\\plugins
if not exist "%OPENCODE_CONFIG_DIR%" mkdir "%OPENCODE_CONFIG_DIR%"
xcopy /E /I /Y "%SCRIPT_DIR%" "%OPENCODE_CONFIG_DIR%\\glootie" >nul 2>&1
echo Global installation complete!
`
      };
    }
  }
];

function createAdapterClass(cfg) {
  class DynamicCLIAdapter extends CLIAdapter {
    constructor() {
      super(cfg);
    }

    formatConfigJson(config, pluginSpec) {
      return cfg.formatConfigJson.call(this, config, pluginSpec);
    }

    getPackageJsonMain() {
      return cfg.getPackageJsonMain ? cfg.getPackageJsonMain() : 'cli.js';
    }

    getPackageJsonFields() {
      return cfg.getPackageJsonFields ? cfg.getPackageJsonFields() : { files: [] };
    }

    getAdditionalFiles(pluginSpec, readFile) {
      return cfg.getAdditionalFiles ? cfg.getAdditionalFiles(pluginSpec, readFile) : {};
    }
  }

  return DynamicCLIAdapter;
}

module.exports = { config, createAdapterClass };
