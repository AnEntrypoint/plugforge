# API Reference

Complete glootie.json schema and hook signatures.

## glootie.json Schema

```json
{
  "name": "string (required)",
  "version": "string (required, semver)",
  "description": "string (optional)",
  "author": "string (required)",
  "license": "string (required, SPDX)",
  "repository": "string (optional)",
  "homepage": "string (optional)",
  "agents": ["string"],
  "hooks": ["string"],
  "mcp": { "tools": [], "resources": [] },
  "platforms": { "cc": {}, "gc": {}, "oc": {}, "vscode": {}, "cursor": {}, "zed": {}, "jetbrains": {}, "copilot-cli": {} }
}
```

### Required Fields

**name** - lowercase, no spaces, unique identifier
**version** - MAJOR.MINOR.PATCH semver format
**author** - "Name" or "Name <email@example.com>"
**license** - SPDX identifier (MIT, Apache-2.0, GPL-3.0, etc.)

### Optional Fields

**description** - Displayed in marketplaces
**repository** - Git clone URL
**homepage** - Project homepage URL
**agents** - Array of agent names (files in agents/*.md)
**hooks** - Array of hook names (files in hooks/*.js)
**mcp** - MCP server configuration
**platforms** - Platform enable/disable flags

## Hook Function Signatures

All hooks export same format:

```javascript
module.exports = {
  name: 'hook-name',
  handler: async (context) => {
    // Your code
    return { /* return value */ };
  }
};
```

### Hook: session-start

Called when plugin activates.

```javascript
handler: async (context) => {
  // Initialize resources
  return { success: true, data: {} };
}
```

Context: { platform, version, workspace, config }

### Hook: pre-tool

Called before tool execution.

```javascript
handler: async (toolName, toolInput, context) => {
  // Validate/modify tool call
  return { allowed: true, input: toolInput };
}
```

Parameters: toolName (string), toolInput (object), context

### Hook: prompt-submit

Called when user submits prompt.

```javascript
handler: async (prompt, context) => {
  // Enhance/process prompt
  return { prompt: enhanced, processed: true };
}
```

Context: { platform, session, history, metadata }

### Hook: stop

Called when plugin stops.

```javascript
handler: async (context) => {
  // Cleanup resources
  return { success: true, cleaned: [] };
}
```

Context: { platform, reason, error, session_data }

### Hook: stop-git

Called during git cleanup.

```javascript
handler: async (context) => {
  // Git-specific cleanup
  return { success: true, git_state: 'clean' };
}
```

Context: { platform, git_operation, repo_path, branch }

## Agent Format

Agents are markdown files in agents/*.md:

```markdown
# Agent Name

Description of this agent.

## Role

What this agent does.

## Capabilities

- Capability 1
- Capability 2

## Examples

Examples of agent behavior.
```

## MCP Configuration

```json
{
  "mcp": {
    "tools": [
      {
        "name": "tool-name",
        "description": "What tool does",
        "inputSchema": {
          "type": "object",
          "properties": {
            "param": { "type": "string" }
          },
          "required": ["param"]
        }
      }
    ],
    "resources": [
      {
        "uri": "resource://namespace/name",
        "name": "Display Name",
        "description": "What resource provides",
        "mimeType": "application/json"
      }
    ]
  }
}
```

## Complete Example

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "My production-ready AI plugin",
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "repository": "https://github.com/yourname/my-plugin.git",
  "homepage": "https://github.com/yourname/my-plugin",
  "agents": ["gm", "codesearch", "websearch"],
  "hooks": ["session-start", "pre-tool", "prompt-submit", "stop", "stop-git"],
  "mcp": {
    "tools": [
      {
        "name": "search-code",
        "description": "Search codebase",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string" }
          },
          "required": ["query"]
        }
      }
    ]
  },
  "platforms": {
    "cc": { "enabled": true },
    "gc": { "enabled": true },
    "oc": { "enabled": true },
    "vscode": { "enabled": true },
    "cursor": { "enabled": true },
    "zed": { "enabled": true },
    "jetbrains": { "enabled": true },
    "copilot-cli": { "enabled": true }
  }
}
```

## Configuration Guide

Quick reference for configuring glootie.json:

### Required Fields
- **name**: Lowercase, no spaces, unique identifier (e.g., "my-awesome-plugin")
- **version**: MAJOR.MINOR.PATCH semver format (e.g., "1.0.0")
- **author**: Your name or "Name <email@example.com>"
- **license**: SPDX identifier (MIT, Apache-2.0, GPL-3.0, etc.)

### Optional Fields
- **description**: Short description, displayed in marketplaces
- **repository**: Git clone URL for source code
- **homepage**: Project homepage URL
- **agents**: Array of agent markdown files to include (e.g., ["gm", "codesearch"])
- **hooks**: Array of hook JavaScript files to include (e.g., ["session-start", "pre-tool"])
- **mcp**: MCP server configuration (tools and resources)
- **platforms**: Platform enable/disable flags (default: all enabled)

### Minimal Configuration Example
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "license": "MIT"
}
```

## Validation Rules

Builder validates before generation:
1. Required fields present
2. Valid semantic versioning
3. At least one hook
4. Hook files exist
5. Agent files exist
6. Valid SPDX license
7. Valid platform IDs

## Build Cleanup & File Sync

The builder performs automatic file synchronization to ensure clean builds:

### How File Sync Works

Before generating each platform, the builder cleans the output directory:
1. Deletes all files and folders from previous build
2. Regenerates only files matching current adapter logic
3. Prevents stale files from remaining active after code changes

### Why This Matters

When you:
- Remove a hook file from source
- Change adapter logic
- Rename a skill
- Update agent definitions

Old files must be explicitly removed, not left behind. File sync ensures output always matches source truth.

### Triggering File Sync

File sync runs automatically:
```bash
glootie-builder ./my-plugin ./output
```

The builder cleans each platform directory before generation. No manual cleanup needed.

### Verification

After building, output directories contain only:
- Files matching current glootie.json
- Agents in agents/
- Hooks in hooks/ (or hooks.json with config)
- Skills in skills/ or docs/skills/ (platform-specific)
- Platform-specific manifest files

### Troubleshooting Stale Files

If old files appear in output after build:

1. **Check adapter logic** - Ensure createFileStructure() reflects current design
2. **Verify source files** - Confirm agents/, hooks/, skills/ have expected files
3. **Manual cleanup** - Delete output directory and rebuild:
   ```bash
   rm -rf ./output/glootie-*
   glootie-builder ./my-plugin ./output
   ```

### Performance Note

File sync adds minimal overhead:
- Listing/deleting files: ~10-50ms per platform
- Full rebuild: 150-300ms total for all 9 platforms
- Network: No impact (local file operations only)
