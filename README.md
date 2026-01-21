# glootie-builder

Multi-platform plugin builder. Generate production plugins for 8 platforms from single source.

**Build once. Deploy everywhere.**

## Quick Start

```bash
cp -r plugforge-starter my-plugin
cd my-plugin
nano glootie.json
node ../cli.js . ../build
```

## Platforms

Claude Code, Gemini CLI, OpenCode, Copilot CLI, VS Code, Cursor, Zed, JetBrains.

## Usage

```bash
node cli.js <plugin-dir> [output-dir]
```

## Plugin Structure

```
my-plugin/
├── glootie.json              # Configuration
├── agents/                   # AI agents (*.md)
│   ├── gm.md
│   ├── codesearch.md
│   └── websearch.md
└── hooks/                    # Event handlers (*.js)
    ├── session-start.js
    ├── pre-tool.js
    ├── prompt-submit.js
    ├── stop.js
    └── stop-git.js
```

## Configuration

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "author": "Name <email@example.com>",
  "license": "MIT",
  "agents": ["gm", "codesearch", "websearch"],
  "hooks": ["session-start", "pre-tool", "prompt-submit", "stop", "stop-git"]
}
```

Required: `name`, `version`, `author`, `license`.

## Documentation

- **CLAUDE.md** - Technical caveats
- **GETTING_STARTED.md** - Plugin creation guide
- **ARCHITECTURE.md** - System design
- **PLATFORMS.md** - Platform details
- **API.md** - Schema reference

## Build Output

CLI platforms: Hook files, `package.json`, `.mcp.json`
Extension platforms: Compiled `dist/`, manifests

## License

MIT
