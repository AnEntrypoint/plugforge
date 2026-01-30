# Architecture & Philosophy

This document captures the architectural decisions, design philosophy, and critical gotchas for plugforge. The system is designed around convention-driven generation, single-source-of-truth plugin specs, and zero configuration required.

## Design Philosophy

### Convention-Driven Multi-Platform Generation

plugforge solves the problem of maintaining 9 identical platform implementations from a single source. Rather than writing platform-specific code or using build-time templates, plugforge uses **convention-driven discovery**:

**Convention loader discovers** from `plugforge-starter/`:
- `glootie.json` - Single specification for all platforms
- `agents/` - AI agent definitions (gm.md, codesearch.md, websearch.md)
- `skills/` - Reusable skill packs with YAML frontmatter
- `hooks/` - Platform-agnostic hook implementations
- `CLAUDE.md` - Context for Claude plugins

**Adapters generate** platform-specific output by adapting this convention to each platform's manifest format (package.json, plugin.xml, Cargo.toml, etc).

This approach means:
- Single source of truth in `plugforge-starter/`
- No duplication across 9 platform implementations
- Adding a skill automatically appears in all 9 outputs
- No build configuration required; convention replaces configuration

### File Sync and Clean Builds

When adapter logic changes, old files persist in output directories unless explicitly removed. This creates stale code illusion where the system appears to work but runs old files.

**Solution:** `cleanBuildDir()` in auto-generator.js:
1. Before each platform build, delete entire output directory
2. Regenerate from scratch
3. Only files matching current adapter logic appear in output

This prevents the most insidious bugs where modified adapters still leave old files active.

### Shared Template Building via Library Extraction

Duplication across platform adapters causes maintenance burden. Each adapter reimplemented:
- `generatePackageJson()`
- `generateMcpJson()`
- `loadSkillsFromSource()`
- `buildHooksMap()`

**Solution:** `template-builder.js` extracts shared methods:
- `TemplateBuilder.generatePackageJson()` - Unified package.json generation
- `TemplateBuilder.generateMcpJson()` - Unified MCP configuration
- `TemplateBuilder.loadSkillsFromSource()` - Unified skill discovery
- `TemplateBuilder.buildHooksMap()` - Unified hook mapping

All adapters now use these shared methods. Changes to template generation propagate to all 9 platforms automatically.

### Platform Adapter Hierarchy

Adapters are organized by inheritance to minimize duplication:

**PlatformAdapter (base.js):** Abstract base with core methods
- `createFileStructure()` - Must be implemented by subclass
- `generatePackageJson()` - Uses TemplateBuilder
- `generateMcpJson()` - Uses TemplateBuilder
- `readSourceFile()` - Helper for agent/hook file discovery
- `mapHookName()` - Canonical hook name mapping

**ExtensionAdapter (extension-adapter.js):** Base for IDE extensions (VSCode, Cursor, Zed, JetBrains)
- `generateExtensionManifest()` - Must be implemented by subclass

**CLIAdapter (cli-adapter.js):** Base for CLI platforms (Claude Code, Gemini, OpenCode, Codex)
- Specialized hook generation for CLI tools
- Support for both bare and wrapped hook output formats

**Platform-specific adapters:** Minimal platform code (vscode.js, cursor.js, zed.js, jetbrains.js, etc)
- Only platform-specific file generation
- Most logic inherited from base or extension adapters

## Technical Caveats

### Hook Naming Ambiguity

**Issue:** Hook files have multiple naming conventions in plugforge-starter:
- `hooks/pre-tool-use-hook.js` vs `hooks/pre-tool.js`
- `hooks/session-start-hook.js` vs `hooks/session-start.js`

**Why it matters:** cli-adapter.js has fallback logic (lines 70-79) that tries multiple paths. This creates silent failures where wrong hook gets loaded.

**Fix:** Consolidate on single canonical name per hook. Update fallback logic to be explicit about search order.

**Affected files:**
- `cli-adapter.js::getHookSourcePaths()` - Define canonical names here
- `plugforge-starter/hooks/` - Name all files by canonical convention
- Update documentation to show single correct naming

### Build Verification Gaps

**Issue:** No validation that generated files match expected structure. Added files can be missed in output; removed files persist.

**Solution:** Add `validateGeneratedFiles()` integration:
- Compare expected file manifest vs actual files
- Report orphaned files (in output but not expected)
- Report missing files (expected but not in output)

### Skill Discovery Path Variations

**Issue:** Different adapters use different base paths for skills:
- `skills/` for CLI adapters
- `skills/` for VSCode, Cursor, Zed
- `docs/skills/` for JetBrains

This is intentional (respects platform conventions), but easy to miss during refactoring.

**Mitigations:**
- TemplateBuilder.loadSkillsFromSource() takes configurable baseOutputPath
- Adapters pass correct path: `TemplateBuilder.loadSkillsFromSource(sourceDir, 'skills')` or `'docs/skills'`
- Document path convention per adapter

## Configuration Reference

**Single source of truth:** `plugforge-starter/glootie.json`
- Defines name, version, description, author, license, keywords
- Lists MCP servers, hook definitions, publication targets
- Automatically discovered by convention loader

**Input structure:**
```
plugforge-starter/
├── glootie.json          # Single spec for all 9 platforms
├── agents/               # Auto-detected and distributed
│   ├── gm.md
│   ├── codesearch.md
│   └── websearch.md
├── skills/               # SKILL.md files with YAML frontmatter
│   ├── code-search/
│   │   └── SKILL.md
│   ├── web-search/
│   │   └── SKILL.md
│   └── ...
├── hooks/                # Platform-agnostic implementations
│   ├── pre-tool-use-hook.js (or pre-tool.js)
│   ├── session-start-hook.js (or session-start.js)
│   ├── prompt-submit-hook.js (or prompt-submit.js)
│   ├── stop-hook.js (or stop.js)
│   └── stop-hook-git.js (or stop-git.js)
└── CLAUDE.md             # Plugin context
```

**Output structure (per platform):** 9 auto-generated repos
1. glootie-cc (Claude Code) - JSON config
2. glootie-gc (Gemini CLI) - JSON config
3. glootie-oc (OpenCode) - JSON config
4. glootie-codex (Codex) - JSON config
5. glootie-copilot-cli (Copilot) - JSON config
6. glootie-vscode - package.json + JavaScript
7. glootie-cursor - package.json + JavaScript
8. glootie-zed - Cargo.toml + Rust
9. glootie-jetbrains - build.gradle.kts + Kotlin

**CLI platforms (cc, gc, oc, codex, copilot-cli):**
- Each gets custom hookEventNames, hookOutputFormat, tools, env config
- Defined in platforms/cli-config-*.js (one per platform)
- createAdapterClass() instantiates CLIAdapter with platform config

**Paths:** All source in `plugforge-starter/`. Output in specified build directory. No persistent state between builds.

## Service Architecture Details

**AutoGenerator:** Orchestrates multi-platform generation
- Loads plugin spec via ConventionLoader
- Validates spec completeness
- For each platform:
  1. Cleans build directory (removes stale files)
  2. Instantiates platform adapter
  3. Generates file structure
  4. Writes to output directory
- Collects and reports results (success/fail per platform)

**Graceful degradation:** Single platform failure doesn't stop entire build. All 9 platforms attempt generation. Failed platforms reported in results, successful ones published.

**File structure generation:** Each adapter implements `createFileStructure()` which returns object mapping file paths to content. writeFiles() handles actual file I/O with create-missing-directories.

## Complete Repository List

plugforge auto-generates and publishes 9 repos to GitHub:

### CLI Platforms (5 Repos)
1. **glootie-cc** - https://github.com/AnEntrypoint/glootie-cc - Claude Code plugin
2. **glootie-gc** - https://github.com/AnEntrypoint/glootie-gc - Gemini CLI extension
3. **glootie-oc** - https://github.com/AnEntrypoint/glootie-oc - OpenCode plugin
4. **glootie-codex** - https://github.com/AnEntrypoint/glootie-codex - Codex plugin
5. **glootie-copilot-cli** - https://github.com/AnEntrypoint/glootie-copilot-cli - GitHub Copilot CLI profile

### IDE Extensions (4 Repos)
6. **glootie-vscode** - https://github.com/AnEntrypoint/glootie-vscode - VS Code extension
7. **glootie-cursor** - https://github.com/AnEntrypoint/glootie-cursor - Cursor extension (VSCode-compatible)
8. **glootie-zed** - https://github.com/AnEntrypoint/glootie-zed - Zed extension (Rust, Cargo)
9. **glootie-jetbrains** - https://github.com/AnEntrypoint/glootie-jetbrains - JetBrains plugin (Kotlin, Gradle)

Each repo is auto-generated from `plugforge-starter/` by GitHub Actions on every commit to main.
