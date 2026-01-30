# Getting Started: Build Your First Plugin

5-step complete guide to creating a multi-platform AI plugin.

## Step 1: Copy Starter Template

```bash
cp -r plugforge-starter my-awesome-plugin
cd my-awesome-plugin
ls -la
```

You'll see:
- `glootie.json` - Configuration file
- `README.md` - Plugin documentation
- `agents/` - AI system prompts (gm.md, codesearch.md, websearch.md)
- `hooks/` - Implementation code (session-start.js, pre-tool.js, etc.)

## Step 2: Configure glootie.json

See API.md § "Configuration Guide" for complete field reference and examples.

Minimal configuration:
```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "license": "MIT"
}
```

To add agents, hooks, and configure platforms, refer to API.md Configuration Guide.

## Step 3: Customize Agents (Optional)

Edit `agents/gm.md` to customize the main agent system prompt.

See API.md § "Agent Format" for the markdown specification and examples. Agents support markdown format with role and capabilities sections.

## Step 4: Customize Hooks (Optional)

Hooks are in `hooks/` directory. Each is optional. Starter provides complete implementations.

See API.md § "Hook Function Signatures" for complete hook reference, context parameters, and examples:
- **session-start.js** - Called when plugin loads
- **pre-tool.js** - Called before any tool execution
- **prompt-submit.js** - Called when user submits prompt
- **stop.js** - Called when plugin stops
- **stop-git.js** - Called during git cleanup

## Step 5: Build and Deploy

### Build

```bash
glootie-builder build all
```

Output in `dist/`:
- `dist/cc/` - Claude Code
- `dist/gc/` - Gemini CLI
- `dist/oc/` - OpenCode
- `dist/copilot-cli/` - GitHub Copilot CLI
- `dist/vscode/` - VS Code
- `dist/cursor/` - Cursor
- `dist/zed/` - Zed
- `dist/jetbrains/` - JetBrains

### Deploy

**Claude Code (cc):**
```bash
cp -r dist/cc/* ~/.claude-code/plugins/my-plugin/
# Restart Claude Code
```

**Gemini CLI (gc):**
```bash
cp -r dist/gc/* ~/.gemini/extensions/my-plugin/
# Restart Gemini CLI
```

**OpenCode (oc):**
```bash
./dist/oc/setup.sh  # Local setup
# or ./dist/oc/install-global.sh  # Global installation
```

**GitHub Copilot CLI (copilot-cli):**
```bash
cp -r dist/copilot-cli/* ~/.copilot/profiles/my-plugin/
# Restart Copilot CLI
```

**VS Code (vscode):**
```bash
cd dist/vscode
npm install && npm run compile
npm run package  # Creates VSIX for distribution
# Upload to VS Code Marketplace via vsce CLI
```

**Cursor (cursor):**
```bash
cp -r dist/cursor/* ~/.cursor/extensions/my-plugin/
# Restart Cursor
```

**Zed (zed):**
```bash
cd dist/zed
cargo build --release
# Compiled binary in target/release/
# Place in Zed extensions directory
```

**JetBrains (jetbrains):**
```bash
cd dist/jetbrains
./gradlew build
# JAR in build/distributions/
# Install via plugin manager or distribute
```

See PLATFORMS.md for platform-specific requirements and notes.

## Example: Code Quality Plugin

### 1. Initialize
```bash
cp -r plugforge-starter code-quality
cd code-quality
```

### 2. Configure glootie.json
```json
{
  "name": "code-quality",
  "version": "1.0.0",
  "description": "AI-powered code quality analyzer",
  "author": "You",
  "license": "MIT",
  "agents": ["gm"],
  "hooks": ["session-start", "pre-tool"]
}
```

### 3. Update agents/gm.md
```markdown
# Code Quality Analyzer

You are an expert code quality analyst.

When analyzing code:
1. Check for performance issues
2. Identify security vulnerabilities
3. Suggest architectural improvements
4. Recommend testing strategies

Provide actionable feedback with examples.
```

### 4. Build
```bash
glootie-builder build all
```

### 5. Deploy
```bash
# Claude Code
cp dist/cc/* ~/.claude-code/plugins/code-quality/

# VS Code
cd dist/vscode && npm install && npm run compile
```

Done! Your plugin works on 8 platforms.

## Clean Builds

If you see old files in output after modifying your plugin:

```bash
rm -rf ./dist
glootie-builder ./my-plugin ./dist
```

The builder automatically cleans output directories before generation, removing stale files from previous builds. See API.md § "Build Cleanup & File Sync" for details.

## Troubleshooting Builds

### Old Files Persist

When you remove hooks or agents, old files may linger in output. Solution:
```bash
rm -rf ./dist/glootie-*
glootie-builder ./my-plugin ./dist
```

Each platform is cleaned before generation. Manual deletion isn't usually needed.

### Missing Files in Output

If expected files don't appear:
1. Verify `agents/` directory has correct .md files
2. Check `hooks/` has .js files for configured hooks
3. Confirm `skills/` directory exists (if using skills)
4. Run rebuild with debug output

### Build Fails for Single Platform

The builder gracefully continues if one platform fails. Check the error message and fix:
- Hook naming (use canonical names in hooks/)
- File encoding (must be UTF-8)
- Invalid JSON in glootie.json

Other platforms still build successfully.

## Next Steps

- Explore `plugforge-starter/` template
- Read builder source in `lib/` and `platforms/` directories
- Check `CLAUDE.md` for technical caveats
- Review `PLATFORMS.md` for platform-specific details
- See API.md for complete configuration reference
