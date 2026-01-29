module.exports = {
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
      bin: { 'glootie-oc': './index.js' },
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
        'install-global.bat',
        'README.md'
      ],
      keywords: [
        'opencode',
        'opencode-plugin',
        'mcp',
        'automation',
        'glootie'
      ]
    };
  },
  generatePackageJson(pluginSpec, extraFields = {}) {
    return JSON.stringify({
      name: `${pluginSpec.name}-oc`,
      version: pluginSpec.version,
      description: pluginSpec.description,
      author: pluginSpec.author,
      license: pluginSpec.license,
      keywords: pluginSpec.keywords,
      repository: {
        type: 'git',
        url: `https://github.com/AnEntrypoint/${pluginSpec.name}-oc.git`
      },
      homepage: `https://github.com/AnEntrypoint/${pluginSpec.name}-oc#readme`,
      bugs: {
        url: `https://github.com/AnEntrypoint/${pluginSpec.name}-oc/issues`
      },
      engines: pluginSpec.engines,
      publishConfig: pluginSpec.publishConfig,
      ...extraFields
    }, null, 2);
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
      'index.js': `export const glootie = async ({ project, client, $, directory, worktree }) => {
  return {
    hooks: {
      sessionStart: require('./hooks/session-start-hook.js'),
      preTool: require('./hooks/pre-tool-use-hook.js'),
      promptSubmit: require('./hooks/prompt-submit-hook.js'),
      stop: require('./hooks/stop-hook.js'),
      stopGit: require('./hooks/stop-hook-git.js')
    }
  };
};
`,
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
      'setup-global.js': `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const configDir = process.env.XDG_CONFIG_HOME
  ? path.join(process.env.XDG_CONFIG_HOME, 'opencode')
  : path.join(os.homedir(), '.config', 'opencode');

const pluginDir = path.join(configDir, 'plugins', 'glootie');
const scriptDir = __dirname;

console.log('Installing glootie plugin globally...');
console.log('Target directory:', pluginDir);

try {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const parentDir = path.dirname(pluginDir);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const files = fs.readdirSync(scriptDir);
  files.forEach(file => {
    const src = path.join(scriptDir, file);
    const dest = path.join(pluginDir, file);

    if (file !== 'node_modules' && file !== '.git') {
      copyRecursive(src, dest);
    }
  });

  console.log('Installation complete!');
} catch (err) {
  console.error('Installation failed:', err.message);
  process.exit(1);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}
`,
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
  },
  generateReadme(spec) {
    return `# ${spec.name} for OpenCode

## Installation

### Local (project-level)

\`\`\`bash
./setup.sh
\`\`\`

Or on Windows:

\`\`\`bat
setup.bat
\`\`\`

### Global

\`\`\`bash
./install-global.sh
\`\`\`

Or on Windows:

\`\`\`bat
install-global.bat
\`\`\`

## Environment

Set OC_PLUGIN_ROOT to your plugin directory in your shell profile.

## Features

- MCP tools for code execution and search
- State machine agent policy (gm)
- Stop hook verification loop
- Git enforcement on session end
- AST analysis via thorns at session start

The plugin activates automatically on session start.
`;
  }
};
