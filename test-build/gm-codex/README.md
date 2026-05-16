# gm-codex for Codex

## Installation

### One-liner (recommended)

```bash
bun x gm-codex@latest
```

Installs the plugin to `~/.codex/plugins/gm-codex` AND wires `~/.codex/config.toml` so Codex auto-loads hooks, MCP servers, and skills on next start. No manual TOML editing required. Idempotent — re-run to upgrade.

### What gets registered in `config.toml`

Inside a managed block fenced by `# >>> gm-codex managed` / `# <<< gm-codex managed` sentinels:

- `[features].codex_hooks = true`
- `[[hooks.<Event>]]` blocks for `PreToolUse`, `PostToolUse`, `SessionStart`, `UserPromptSubmit`, `Stop` — pointing at the bundled `plugkit` and node hook scripts under the install dir
- `[mcp_servers.<id>]` for any MCP servers declared in bundled `.mcp.json`
- `[[skills.config]]` entries for every bundled skill folder

Content outside the managed block is preserved verbatim. The installer never edits user-authored sections.

### Repository Installation (Project-Specific)

```bash
cd /path/to/your/project
npm install gm-codex
npx gm-codex-install
```

Copies plugin assets into `<project>/.codex/plugins/gm-codex` and writes the same managed block into `<project>/.codex/config.toml` (project-trusted layer).

### Uninstall

```bash
npx gm-codex-uninstall
```

Removes the plugin directory and strips the managed block from `config.toml`, leaving any user-authored content untouched.

### Manual Installation

**Windows and Unix:**
```bash
git clone https://github.com/AnEntrypoint/gm-codex ~/.codex/plugins/gm-codex
```

**Windows PowerShell:**
```powershell
git clone https://github.com/AnEntrypoint/gm-codex "\$env:APPDATA\codex\plugins\gm-codex"
```

## Installed Layout

After install, the Codex plugin directory contains:

```
plugins/gm-codex/
├── .codex-plugin/plugin.json
├── .agents/plugins/marketplace.json
├── agents/
├── hooks/
├── scripts/
├── skills/
├── .mcp.json
├── gm.json
└── plugin.json
```

## Runtime Behavior

- Hooks call `bin/plugkit` through `${CODEX_PLUGIN_ROOT}`.
- `plugkit` binaries are bundled in `bin/` for every supported platform; the plugin ships ready-to-run.
- `plugkit` uses:
  - `rs-exec` for execution/runtime process management
  - `rs-codeinsight` for AST/project analysis
  - `rs-search` for search/MCP search behavior

## Environment

- `CODEX_PLUGIN_ROOT`: plugin root used by hooks
- `CODEX_PROJECT_DIR`: project root for hook/runtime operations

## Features

- Stateful agent policy via `agents/gm.md`
- Hook enforcement for session lifecycle
- Rust-backed execution and background task control
- Rust-backed code insight and search integrations
- Generated Codex plugin metadata and marketplace manifests

## Update Procedures

### User-wide install

```bash
bun x gm-codex@latest
```

### Project-level install

```bash
npm update gm-codex
npx gm-codex-install
```

## Troubleshooting

### Hooks run but `plugkit` is missing

- Reinstall the plugin; `plugkit` binaries are shipped in `bin/` via CI and should not need to be downloaded.

### Hook path issues

- Verify `CODEX_PLUGIN_ROOT` points to the installed plugin root.
- Confirm `hooks/hooks.json` commands resolve to `${CODEX_PLUGIN_ROOT}/bin/plugkit`.

### Plugin loaded but behavior is incomplete

- Check `skills/`, `scripts/`, and `agents/` were copied by installer.
- Re-run installer and restart Codex.

## License

MIT
