# GM - GM State Machine for Antigravity

An AI-powered state machine extension for Google Antigravity IDE with autonomous agent coordination.

## About Antigravity

Antigravity is Google's agentic IDE built on a fork of VS Code. It uses the OpenVSX registry and ships its own `antigravity` CLI for extension management. This extension is API-compatible with the VS Code extension surface.

## Features

- **State Machine**: PLAN → EXECUTE → EMIT → VERIFY → COMPLETE phases with full mutable tracking
- **Autonomous Agents**: gm, codesearch, and websearch agents pre-configured
- **Hot Reload**: Zero-downtime updates to agent logic
- **Real-Time Debugging**: Inspect internal state and agent behavior
- **Code Search**: Semantic code search via integrated agents
- **Web Search**: LLM-powered web search capabilities

## Installation

```bash
bunx gm-antigravity@latest
```

or with npx:

```bash
npx gm-antigravity@latest
```

This downloads the package and runs the bundled installer, which calls `antigravity --install-extension` against the bundled `.vsix`. Requires Google Antigravity IDE to be installed (the `antigravity` CLI must be on PATH or in a standard install location).

### Manual install

```bash
antigravity --install-extension gm-antigravity.vsix
```

## Quick Start

Once installed, the extension activates automatically. On the first workspace open, GM scaffolds two files into the project's `.agent/` directory if absent: `rules/gm-state-machine.md` (an always-on rule that frames every task as PLAN → EXECUTE → EMIT → VERIFY → COMPLETE with witnessed execution) and `workflows/plan-execute-emit-verify.md` (the matching numbered lifecycle workflow). Existing `.agent/` files are never overwritten.

Antigravity has no native VS Code-style hooks, so behavior shaping happens through these workspace files instead. Edit them freely; the extension never re-asserts.

Access GM via:

- Command palette: `Ctrl+Shift+P` → "GM: Activate"
- Settings: `gm.enabled`, `gm.autoActivate`, `gm.logLevel`

## License

MIT
