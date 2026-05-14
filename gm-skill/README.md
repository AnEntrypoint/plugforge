# gm-skill

Unified skill library for gm platform implementations.

## Installation

### Via npm

```bash
npm install gm-skill
```

### Via Bun Skills CLI

Install the gm-skill package alongside other agents and frameworks:

```bash
bun x skills add AnEntrypoint/gm-skill
```

This installs all 6 core skills across your available AI agents and IDEs:
- `gm` - Skill chain orchestrator
- `planning` - PLAN phase: mutable discovery and PRD construction
- `gm-execute` - EXECUTE phase: resolve unknowns by witness
- `gm-emit` - EMIT phase: write files and verify from disk
- `gm-complete` - COMPLETE phase: system verification and git enforcement
- `update-docs` - UPDATE-DOCS phase: refresh documentation and push

After installation, skills are available universally across 55+ agents (Cursor, Cline, Codex, Gemini CLI, Qwen Code, etc.).

## Usage

### Daemon Bootstrap Functions

```javascript
const {
  ensureRsLearningDaemonRunning,
  ensureRsCodeinsightDaemonRunning,
  ensureRsSearchDaemonRunning,
  ensureAcptoapiRunning,
  checkPortReachable
} = require('gm-skill');
```

#### Functions

- `ensureRsLearningDaemonRunning()` - Ensures rs-learn daemon is running
- `ensureRsCodeinsightDaemonRunning()` - Ensures rs-codeinsight daemon is running
- `ensureRsSearchDaemonRunning()` - Ensures rs-search daemon is running
- `ensureAcptoapiRunning()` - Ensures acptoapi daemon is running
- `checkPortReachable(host, port, timeoutMs)` - Check if a port is reachable

All functions are async and return an object with `ok` and additional metadata.

### Spool Dispatch Helpers

```javascript
const { spool } = require('gm-skill');
const { writeSpool, readSpoolOutput, waitForCompletion, getAllOutputs } = spool;
```

#### Functions

- `writeSpool(body, lang, options)` - Write code to spool input directory; returns `{ id, path, lang, ext }`
  - `body` (string) - Code to execute
  - `lang` (string, default: `'nodejs'`) - Language: nodejs, python, bash, typescript, go, rust, c, cpp, java, deno
  - `options` (object, optional) - `{ taskId, sessionId }`
- `readSpoolOutput(id)` - Read completed task output; returns `{ id, stdout, stderr, metadata, exitCode, durationMs, timedOut }`
- `waitForCompletion(id, timeoutMs)` - Poll for task completion; returns promise with `{ ok, ...output }`
- `getAllOutputs()` - Enumerate all completed tasks in spool directory; returns array of output objects

All paths are platform-aware (Windows and POSIX compatible).

#### Example

```javascript
const { spool } = require('gm-skill');

const result = spool.writeSpool('console.log("hello")', 'nodejs');
console.log(result.id);

const output = await spool.waitForCompletion(result.id, 30000);
console.log(output.stdout);
```

### Skill Manifests

```javascript
const { manifest } = require('gm-skill');
const { getManifest, getSkill, getAllSkills } = manifest;
```

#### Functions

- `getManifest()` - Get full package manifest with all 4 core skills; returns `{ name, version, description, skills: [...] }`
- `getSkill(name)` - Get individual skill manifest by name (gm, gm-execute, gm-emit, gm-complete); returns skill object with metadata
- `getAllSkills()` - Get array of all 4 core skills with full metadata; returns `[{ name, description, allowedTools, compatiblePlatforms, endToEnd, skillMdContent }, ...]`

Skill metadata includes:
- `name` - Skill identifier
- `description` - Human-readable skill purpose
- `allowedTools` - Array of tool names the skill permits
- `compatiblePlatforms` - Array of platforms this skill targets
- `endToEnd` - Boolean flag indicating end-to-end skill vs helper
- `skillMdContent` - Full SKILL.md file content

#### Example

```javascript
const { manifest } = require('gm-skill');

const allSkills = manifest.getAllSkills();
allSkills.forEach(skill => {
  console.log(`${skill.name}: ${skill.description}`);
});

const gmSkill = manifest.getSkill('gm');
console.log('Allowed tools:', gmSkill.allowedTools);
```
