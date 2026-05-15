# gm for Gemini CLI

gm extends Gemini CLI with AI-native software engineering via plugkit hooks and orchestrated skill execution. This package wires the same gm orchestration layer used in Claude Code to Gemini CLI's extension system.

## Feature Parity with gm-cc

| Feature | gm-cc | gm-gc | Notes |
|---------|-------|-------|-------|
| **Planning** | ✓ | ✓ | Same planning skill, writes .gm/prd.yml |
| **Execution** | ✓ | ✓ | Same gm-execute phase, mutables tracking |
| **Skills** | ✓ | ✓ | All 24 bundled skills available |
| **Code Search** | ✓ | ✓ | Spool-based exec:codesearch |
| **Agent Orchestration** | ✓ | ✓ | gm + research-worker + memorize agents |
| **Prompts** | ✓ | ✓ | Loaded from prompts/ directory |
| **Git Integration** | ✓ | ✓ | Stop hook verifies commits/pushes |
| **Browser Automation** | ✓ | ✓ | exec:browser skill available |
| **Session State** | ✓ | ✓ | .gm/ directory tracks PRD, mutables, turn state |

## Installation

### Quick Install (Git-based)

```bash
# macOS/Linux
git clone https://github.com/AnEntrypoint/gm-gc ~/.gemini/extensions/gm

# Windows PowerShell
git clone https://github.com/AnEntrypoint/gm-gc "$env:APPDATA/gemini/extensions/gm"
```

Then restart Gemini CLI to activate the extension.

### npm Install (Project-scoped)

```bash
npm install gm-gc
npx gm-gc-install
```

Copies gm-gc to `~/.gemini/extensions/gm` and registers hooks.

## Hook Event Mapping

Gemini CLI hooks are wired to plugkit subcommands via `gemini-extension.json`:

| Gemini CLI Event | Hook Type | plugkit Subcommand | Purpose |
|------------------|-----------|-------------------|---------|
| `BeforeTool` | Pre-execution guard | `pre-tool-use` | Enforce gm policy, needs-gm gate, mutable check |
| `SessionStart` | Initialization | `session-start` | Load skills, prompts, AST analysis, bootstrap daemons |
| `BeforeAgent` | Agent arrival | `prompt-submit` | Auto-recall, state update, residual-scan gate |
| `SessionEnd` | Cleanup | `stop` | Verify PRD empty, check git status |
| `SessionEnd` | Git enforcement | `stop-git` | Enforce commits/pushes before session exit |

## Elegant Workarounds for Platform Differences

### Difference 1: Hook Execution Model

**gm-cc**: JavaScript hooks (`kind: 'js'`) run directly in Node context  
**gm-gc**: Plugkit-based hooks (`kind: 'plugkit'`) via subcommand dispatch

**Workaround**: All orchestration logic moved to plugkit (`rs-plugkit/src/hook/`). The hooks.json in gm-gc delegates to plugkit, which handles the state machine identically to gm-cc. Both emit valid JSON to their respective CLIs.

### Difference 2: File Installation Paths

**gm-cc**: `~/.claude/plugins/gm/` (recognized by Claude Code)  
**gm-gc**: `~/.gemini/extensions/gm/` (recognized by Gemini CLI)

**Workaround**: Platform-agnostic postinstall script in `install.js` detects the context (node_modules vs direct clone) and resolves paths via environment. On direct clone, no installation needed—git clone to the correct location directly. On npm install, postinstall copies to the appropriate path.

### Difference 3: Skills Distribution

**gm-cc**: Skills included in package.json `files` array and loaded via JavaScript imports  
**gm-gc**: Skills included in package.json `files` array and loaded via filesystem spool

**Workaround**: `skills/` is now bundled in both (after the fix on line 1381 of cli-config-shared.js). The skills are identical SKILL.md files. gm-cc imports them with `require()`, while gm-gc discovers them via directory scanning on session-start. Both reach the same .gm/skills/ spool directory during execution.

### Difference 4: Prompts and Context Loading

**gm-cc**: Prompts loaded via JavaScript in hook layer  
**gm-gc**: Prompts loaded via plugkit session-start hook and stored in .gm/turn-state.json

**Workaround**: Both load `prompts/*.txt` files (bash-deny.txt, session-start.txt, prompt-submit.txt, pre-compact.txt). gm-cc caches them in memory; gm-gc writes them to turn-state.json for skill reference via spool. The same prompts/ directory is used by both.

### Difference 5: Agent Dispatch

**gm-cc**: Agents loaded from `agents/*.md` and dispatched via Claude Code's native agent system  
**gm-gc**: Agents loaded from `agents/*.md` and dispatched via plugkit MCP server interface

**Workaround**: Agent YAML frontmatter is identical between both. Agent bodies remain untouched. Only agent dispatch mechanism differs. gm-gc agents are available for invocation via the same gm orchestration commands but execute through the Gemini CLI agent interface rather than Claude Code's.

## Directory Structure

After installation to `~/.gemini/extensions/gm/`:

```
gm/
├── agents/                 # Skill-orchestration agents (gm, memorize, research-worker, textprocessing)
├── skills/                 # All 24 bundled skills (planning, gm-execute, gm-emit, gm-complete, browser, etc.)
├── scripts/                # Utility scripts shared between platforms
├── bin/
│   ├── bootstrap.js        # Daemon initialization (rs-plugkit, rs-learn, rs-codeinsight)
│   ├── plugkit.js          # Wrapper for rs-plugkit binary
│   └── plugkit.sha256      # Binary integrity check
├── hooks/
│   └── hooks.json          # Hook event → plugkit subcommand mapping
├── prompts/                # Prompt templates (bash-deny.txt, session-start.txt, etc.)
├── AGENTS.md               # Agent descriptions and constraints
├── gemini-extension.json   # Gemini CLI extension manifest
└── .mcp.json               # MCP server configuration
```

When gm runs:

```
~/.gemini/extensions/gm/     # Extension root
└─ .gm/                      # Session state (created by gm on first use)
   ├── prd.yml              # Current task PRD
   ├── mutables.yml         # Mutable discovery state
   ├── turn-state.json      # Prompts, session metadata
   ├── exec-spool/          # Task spool for code execution
   ├── code-search/         # Search index
   └── rs-learn.db          # Shared memory database
```

## Operational Differences

### Skill Invocation

Both platforms invoke skills via the same gm orchestration chain:

```
planning → gm-execute → gm-emit → gm-complete → update-docs
```

**gm-cc**: `Skill(skill: "planning")` dispatched by Claude Code  
**gm-gc**: `Skill(skill: "planning")` dispatched by Gemini CLI's ACP agent system via rs-plugkit bridge

### Prompts Available

Both have access to:

- **session-start.txt**: Injected on session initialization (explains gm to the model)
- **prompt-submit.txt**: Injected on every user message (reinforces orchestration discipline)
- **bash-deny.txt**: Injected when bash is blocked (explains why)
- **pre-compact.txt**: Injected before session ends (reminder for residual scan)

Load from `~/.gemini/extensions/gm/prompts/` or `~/.claude/plugins/gm/prompts/` respectively.

### Git Enforcement

Both enforce identical stop-hook logic:

1. On session end, check git status
2. If dirty: block first stop, warn and emit reason
3. On second stop: allow (assume user fixed)
4. If commits unpushed: block, require push before exiting

## Limitations & Future Work

| Limitation | gm-cc | gm-gc | Workaround |
|-----------|-------|-------|------------|
| Browser automation test suite | Not yet | Not yet | Use exec:browser skill directly in PRD items |
| Custom hook middleware | N/A | N/A | Hooks are plugkit-based and extensible via rs-plugkit |
| Skill hot-reload | No | No | Restart Gemini CLI session |
| Cross-session memory sharing | Via rs-learn.db (yes) | Via rs-learn.db (yes) | Shared database at ~/.gm/rs-learn.db |

## Troubleshooting

### Hooks not firing

```bash
# Check hook registration
cat ~/.gemini/extensions/gm/gemini-extension.json | jq '.hooks'

# Check hook execution logs
tail -f ~/.claude/gm-log/$(date +%Y-%m-%d)/hook.jsonl
```

### Skills not found

```bash
# Verify skills copied on install
ls ~/.gemini/extensions/gm/skills/ | head

# Verify permissions
chmod -R +x ~/.gemini/extensions/gm/bin/
```

### gm state not persisting

```bash
# Check .gm directory exists
ls -la ~/.gemini/extensions/gm/.gm/

# Check PRD was written
cat ~/.gemini/extensions/gm/.gm/prd.yml
```

## See Also

- [AGENTS.md](./AGENTS.md) — Agent policies and constraints
- [gm-cc documentation](https://github.com/AnEntrypoint/gm-cc#readme) — Claude Code version
- [gm planning](https://github.com/AnEntrypoint/gm#readme) — Core orchestration
