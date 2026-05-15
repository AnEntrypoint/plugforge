# gm-skill

Unified skill library and bootstrap mechanism for all gm platform implementations (gm-cc, gm-gc, gm-oc, gm-kilo, gm-codex, gm-copilot-cli, gm-vscode, gm-cursor, gm-zed, gm-jetbrains).

## What is gm-skill?

gm-skill is a Node.js library that:

1. **Bootstraps plugkit spontaneously** - Downloads, verifies, and installs the correct platform-specific plugkit binary without requiring pre-installation
2. **Replaces post-write hooks with file-watcher pattern** - Transforms synchronous hook execution into autonomous spool-based dispatch
3. **Provides unified skill loading** - Discovers and loads all 24+ skills (core orchestration, utilities, and platform adapters) from a single manifest
4. **Manages daemon lifecycle** - Spawns and monitors rs-learn, rs-codeinsight, and plugkit daemons with persistent status tracking
5. **Orchestrates skill chains** - Implements the gm → planning → gm-execute → gm-emit → gm-complete → update-docs pipeline

## Architecture

### Core Components

- **rs-plugkit.js** (`bin/rs-plugkit.js`) - Standalone bootstrap tool: `install|ensure|check|version|where|kill|daemon`
- **hook-replacer.js** - File-watcher pattern replacing synchronous hook spawning
- **daemon-bootstrap.js** - Daemon lifecycle manager (spawn, check state, shutdown)
- **spool.js** - File-based task queue for autonomous execution
- **manifest.js** - Skill registry (24 skills, all platforms and utilities)
- **loader.js** - Dynamic skill resolution with fallback search paths
- **hook-bridge.js** - Compatibility layer for hook execution

### Skill Structure

All skills follow this pattern:

```javascript
module.exports = {
  name: 'skill-name',
  description: 'Human-readable description',
  async execute(context) {
    // Skill logic here
    return { ok: true, result: '...' };
  }
};
```

Skills are stored in:
- `gm-skill/skills/` (local stubs, platform adapters, utilities)
- `gm-starter/skills/` (full library of SKILL.md + index.js for each)

## Bootstrap Flow

### 1. Spontaneous Plugkit Download

```bash
node rs-plugkit ensure
```

Does:
1. Read `gm-starter/bin/plugkit.version` (pinned version, e.g., "0.1.366")
2. Check if `~/.claude/gm-tools/plugkit(.exe)` exists and matches SHA256
3. If missing or stale, download correct binary for your platform from GitHub Releases
4. Verify SHA256 hash
5. Make executable (non-Windows)
6. Return when ready

Fallback if SHA manifest is unavailable:
- Trust presence of binary (no SHA check, install anyway)

### 2. File-Watcher Replacement

Instead of hooks calling `plugkit hook <subcommand>` synchronously:

**Old (post-write hooks):**
```json
{
  "kind": "npm-script",
  "hooks": {
    "pre-tool-use": "node plugkit.js hook pre-tool-use"
  }
}
```

**New (file watcher):**
```javascript
// At session start:
hookReplacer.startSpoolWatcher(cwd)
// Returns: PID of plugkit runner daemon

// plugkit runner watches .gm/exec-spool/in/ for new files
// When task file appears, runner processes it autonomously
// Results written to .gm/exec-spool/out/<taskId>.json
```

Benefits:
- No per-hook process spawn (faster, lower overhead)
- Daemon continues running across multiple commands
- Autonomous execution without blocking
- Cross-platform Windows/Mac/Linux support

### 3. Skill Chain Orchestration

```
gm (orchestrator) 
  → calls startSpoolWatcher() 
  → enters planning skill
  → planning → gm-execute → gm-emit → gm-complete → update-docs
  → each skill writes to .gm/prd.yml, .gm/mutables.yml
  → spool watches for exec files, processes async
  → output goes to .gm/exec-spool/out/<taskId>.json
```

## Package.json Exports

```javascript
{
  "bin": {
    "rs-plugkit": "./bin/rs-plugkit.js"
  },
  "exports": {
    ".": "./lib/index.js",
    "./spool": "./lib/spool.js",
    "./daemon-bootstrap": "./lib/daemon-bootstrap.js",
    "./hook-replacer": "./lib/hook-replacer.js",
    "./loader": "./lib/loader.js",
    "./manifest": "./lib/manifest.js",
    // ... 11 more
  }
}
```

Usage:
```javascript
const gm = require('gm-skill');
const { startSpoolWatcher } = require('gm-skill/hook-replacer');
const spool = require('gm-skill/spool');
```

## Cross-Platform Binary Handling

### Platform Keys

- `win32-x64` → `plugkit-win32-x64.exe`
- `win32-arm64` → `plugkit-win32-arm64.exe`
- `darwin-x64` → `plugkit-darwin-x64`
- `darwin-arm64` → `plugkit-darwin-arm64`
- `linux-x64` → `plugkit-linux-x64`
- `linux-arm64` → `plugkit-linux-arm64`

### Bootstrap Caching

- Binary cache: `~/.claude/gm-tools/plugkit[.exe]`
- Version file: `~/.claude/gm-tools/plugkit.version`
- SHA manifest: `~/.claude/gm-tools/plugkit.sha256`

### Bootstrap Retries

- 5 attempts with exponential backoff (2s, 5s, 15s, 30s, 120s)
- Resume downloads on 206 (range request)
- Timeout: 5min per attempt

## Spool-Based Dispatch

Tasks are written to `.gm/exec-spool/in/<lang>/<taskId>.<ext>`:

```
.gm/exec-spool/
  in/
    nodejs/1234.js
    bash/1235.sh
    codesearch/1236.txt
    recall/1237.txt
  out/
    1234.json (metadata)
    1234.out (stdout)
    1234.err (stderr)
    1235.json
    1235.out
    1235.err
```

Output format (`.json`):
```json
{
  "exitCode": 0,
  "durationMs": 125,
  "timedOut": false,
  "error": null
}
```

The file watcher (plugkit runner) processes each task:
1. Read input file
2. Execute via appropriate runtime
3. Write exit code, duration, error to `.json`
4. Write stdout to `.out`
5. Write stderr to `.err`
6. Delete `.processing` marker

## All 24 Skills

### Core Orchestration (6)
- `gm` - Orchestrator (chains planning → execute → emit → complete → update-docs)
- `planning` - PRD construction and mutable discovery
- `gm-execute` - Task execution witness and verification
- `gm-emit` - File writing with post-emit disk verification
- `gm-complete` - Final verification and git enforcement
- `update-docs` - Documentation sync (README, AGENTS.md, docs/index.html)

### Platform Adapters (10)
- `gm-cc` - Claude Code plugin
- `gm-gc` - Cursor editor integration
- `gm-oc` - OpenCode integration
- `gm-kilo` - Kilo CLI
- `gm-codex` - Codex AI platform
- `gm-copilot-cli` - GitHub Copilot CLI
- `gm-vscode` - VS Code extension
- `gm-cursor` - Cursor editor native
- `gm-zed` - Zed editor
- `gm-jetbrains` - JetBrains IDE integration

### Utilities (8)
- `code-search` - rs-codeinsight integration (search-and-replace)
- `browser` - Playwright-based automation
- `ssh` - Remote command execution
- `pages` - GitHub Pages scaffolding
- `governance` - Constraint verification and gate enforcement
- `create-lang-plugin` - Language/CLI plugin generator
- `textprocessing` - Semantic text operations
- `research` - Web research via parallel subagents

## Usage Examples

### Basic Setup
```javascript
const gm = require('gm-skill');

// Ensure plugkit is ready
await gm.ensurePlugkit();

// Start spool watcher
const watcherId = gm.hooks.startWatcher(process.cwd());
console.log('Watcher started:', watcherId);

// Load and execute a skill
const skill = gm.loader.resolveSkill('code-search');
const result = await skill.execute({ query: 'function getData' });
```

### Daemon Bootstrap
```javascript
const result = await gm.bootstrapDaemon('rs-learn', 'rs-learn daemon');
if (result.ok) {
  console.log('Daemon spawned:', result.pid);
  const ready = await gm.waitForReady('rs-learn', '127.0.0.1', 5555);
  if (ready.ok) {
    console.log('Daemon ready');
  }
}
```

### Spool-Based Task
```javascript
const spool = require('gm-skill/spool');

const task = spool.writeSpool('console.log("hello")', 'nodejs');
const result = await spool.waitForCompletion(task.id, 5000);
console.log('Task result:', result);
```

## Environment Variables

- `CLAUDE_SESSION_ID` - Session ID for task tracking
- `PLUGKIT_RELEASE_REPO` - Override GitHub release repo (default: `AnEntrypoint/plugkit-bin`)
- `PLUGKIT_CACHE_DIR` - Override binary cache location (default: `~/.claude/gm-tools`)
- `GM_LOG_DIR` - Override log directory (default: `~/.claude/gm-log`)
- `RTK_DISABLE` - Disable rtk token compression wrapper

## Error Handling

All async functions return `{ ok: true/false, error?, ... }` format:

```javascript
const result = await gm.bootstrapDaemon('my-daemon', 'my-daemon --port 5000');
if (!result.ok) {
  console.error('Bootstrap failed:', result.error);
  // Fallback: use Anthropic SDK directly
}
```

File-watcher failures are non-fatal:
- If plugkit binary unavailable, write error to `.json` and continue
- If chokidar not available, fall back to native `fs.watch()`
- If native watch fails, create polling watcher with small delay

## Integration with gm-cc

gm-cc (Claude Code plugin) uses gm-skill:

1. **Session Start Hook**: Calls `gm.ensurePlugkit()` → ensures binary is ready
2. **Hook Bootstrap**: Calls `gm.hooks.startWatcher()` → starts file watcher daemon
3. **Tool Use**: Tools write files to `.gm/exec-spool/in/`, watcher processes async
4. **Skill Chain**: Invoking gm skill automatically chains through planning → emit → complete

No more synchronous hook blocking—plugkit daemon handles everything.

## Testing

```bash
# Verify bootstrap
node C:\dev\gm\gm-skill\bin\rs-plugkit.js ensure

# Check version
node C:\dev\gm\gm-skill\bin\rs-plugkit.js version

# Verify binary location
node C:\dev\gm\gm-skill\bin\rs-plugkit.js where

# Kill any running daemon
node C:\dev\gm\gm-skill\bin\rs-plugkit.js kill

# Start daemon manually
node C:\dev\gm\gm-skill\bin\rs-plugkit.js daemon .

# Load gm-skill and test
node -e "
const gm = require('./lib/index.js');
console.log('Skills loaded:', gm.manifest.getAllSkills().length);
const skill = gm.loader.resolveSkill('gm-cc');
console.log('Platform skill loaded:', skill.name);
"
```

## License

MIT
