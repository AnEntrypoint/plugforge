# gm for Kilo CLI

## Installation

### One-liner (recommended)

Install directly from npm:

```bash
bun x gm-kilo@latest
```

This copies the plugin to `~/.config/kilo/` and registers it in your config. Restart Kilo to activate.

### Via npm install

```bash
npm install -g gm-kilo
gm-kilo
```

### Manual installation

Clone to the global plugin directory:

```bash
git clone https://github.com/AnEntrypoint/gm-kilo ~/.config/kilo/plugin
```

## Features

- **State machine agent** — PLAN→EXECUTE→EMIT→VERIFY→COMPLETE orchestration
- **Skill chain** — gm, planning, gm-execute, gm-emit, gm-complete, update-docs
- **exec: dispatch** — code execution via spool watcher (nodejs, python, bash, typescript, go, rust)
- **Code search** — semantic codebase exploration via exec:codesearch
- **Git enforcement** — blocks session end with uncommitted changes or unpushed commits
- **Memory** — rs-learn integration for cross-session knowledge retention

## How it works

The plugin installs:
- **Agent** (`agents/gm.md`) — primary orchestrator with skill-chain instructions
- **Skills** (`skills/`) — PLAN, EXECUTE, EMIT, VERIFY, UPDATE-DOCS skill definitions
- **Plugin** (`plugins/gm-kilo.mjs`) — hooks for session lifecycle, tool gating, exec: dispatch
- **Lang runners** (`lang/`) — language-specific execution plugins

All exec: commands route through the spool watcher at `.gm/exec-spool/` for session-isolated task execution.

## Troubleshooting

**Plugin not loading:**
- Verify `~/.config/kilo/plugins/gm-kilo.mjs` exists
- Check `kilocode.json` has the plugin path in the `plugin` array
- Restart Kilo CLI completely

**Skills not appearing:**
- Verify `~/.config/kilo/skills/` contains skill directories with SKILL.md files
- Skill names must be lowercase with hyphens (e.g., `gm`, `gm-execute`)

**exec: commands failing:**
- Check `.gm/exec-spool/` directory exists in your project
- Verify plugkit binary is present at `~/.config/kilo/bin/`
