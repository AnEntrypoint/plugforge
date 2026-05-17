# gm for OpenCode

## Installation

### One-liner (recommended)

Install directly from npm:

```bash
bun x gm-oc@latest
```

This copies the plugin to `~/.config/opencode/` and registers it in your config. Restart OpenCode to activate.

### Via npm install

```bash
npm install -g gm-oc
gm-oc
```

### Manual installation

Clone to the global plugin directory:

```bash
git clone https://github.com/AnEntrypoint/gm-oc ~/.config/opencode/plugin
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
- **Plugin** (`plugins/gm-oc.mjs`) — hooks for session lifecycle, tool gating, exec: dispatch
- **Lang runners** (`lang/`) — language-specific execution plugins

All exec: commands route through the spool watcher at `.gm/exec-spool/` for session-isolated task execution.

## Troubleshooting

**Plugin not loading:**
- Verify `~/.config/opencode/plugins/gm-oc.mjs` exists
- Check `opencode.json` has the plugin path in the `plugin` array
- Restart OpenCode completely

**Skills not appearing:**
- Verify `~/.config/opencode/skills/` contains skill directories with SKILL.md files
- Skill names must be lowercase with hyphens (e.g., `gm`, `gm-execute`)

**exec: commands failing:**
- Check `.gm/exec-spool/` directory exists in your project
- Verify plugkit binary is present at `~/.config/opencode/bin/`
