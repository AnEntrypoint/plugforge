# Code Consolidation Strategy: Black Magic Over Configuration

**Status**: Designed  
**Date**: 2026-05-17  
**Scope**: Eliminate skill duplication across 8 bundled platforms (cc, oc, kilo, codex, copilot-cli, vscode, cursor, zed)

## Current State

- 4 core skills (gm, gm-execute, gm-emit, gm-complete) are **byte-identical** across all 8 bundled platforms
- Each platform independently calls `TemplateBuilder.loadSkillsFromSource(sourceDir, 'skills')` which reads from `skills/` directory
- Result: 8× identical SKILL.md files stored in build output, consuming ~8× the space and creating duplication in source
- AGENTS.md states expected reduction: ~24% (3720→2819 bytes per AGENTS.md)

## Duplication Cost

Per platform, 4 identical skill files ≈ 465 bytes each (1860 bytes total per platform):
- 8 platforms × 1860 bytes = 14,880 bytes of redundant data
- Additionally, 8 independent calls to `loadSkillsFromSource()` create 8 separate parse/copy operations during build

## Proposed Solution: Shared Skill Cache

### Phase 1: TemplateBuilder Inheritance Chain (~80 LOC)

Add three methods to `lib/template-builder.js`:

1. **`selectBundledSkills(platformName)`**  
   Returns true if platform is in [cc, oc, kilo, codex, copilot-cli, vscode, cursor, zed]; false for external-skill platforms (gc, qwen, hermes, thebird, antigravity, windsurf, jetbrains).

2. **`loadSharedSkills(sourceDir)`**  
   Reads the 4 core skills once from source. Returns a cached Map keyed by skill name. This replaces the 8× redundant reads.

3. **`mergeSkillMetadata(skillContent, platformName)`**  
   Applies minimal platform-specific metadata (e.g., tool-availability sigils, provider overrides) to skill frontmatter. For phase 1, this is a pass-through (identity function). Enables future per-platform skill tweaks without duplication.

### Phase 2: Build-Time Consolidation

In `lib/auto-generator.js::generateAllPlatforms()`:

1. **Call `loadSharedSkills()` once** before platform loop
2. **Pass cached skills to each bundled platform** adapter
3. **Bundled adapters reference cache** instead of calling `loadSkillsFromSource()`

```javascript
const sharedSkills = TemplateBuilder.loadSharedSkills(skillsSourceDir);
for (const platform of PLATFORMS) {
  if (TemplateBuilder.selectBundledSkills(platform)) {
    // Use shared cache
    const adapter = new Adapter({ ...config, skillsCache: sharedSkills });
  } else {
    // External-skill platforms use normal flow
    const adapter = new Adapter(config);
  }
}
```

### Phase 3: Adapter Pattern Update

Update `platforms/cli-platforms.js` and `platforms/browser-platforms.js`:

```javascript
if (this.skillsCache) {
  return this.skillsCache;  // Return cached shared skills
} else {
  return TemplateBuilder.loadSkillsFromSource(sourceDir);  // Normal path
}
```

## Benefits

1. **24% size reduction** in skill duplication (verified by AGENTS.md claim, expected ~1860→1410 bytes per platform after dedup)
2. **Single parse**: 4 core skills parsed once, not 8 times
3. **Extensible**: Phase 2 can add per-platform overrides via `mergeSkillMetadata()` without re-duplicating
4. **Configuration-neutral**: Uses code generation (black magic), not configuration files

## Implementation Order

1. Add `selectBundledSkills()`, `loadSharedSkills()`, `mergeSkillMetadata()` to TemplateBuilder
2. Update `auto-generator.js::generateAllPlatforms()` to cache and pass
3. Update platform adapters (cli-platforms.js, browser-platforms.js, vscode.js, etc.) to accept `skillsCache` option
4. Test: build and verify skills are still present, checksums unchanged, no shadowing
5. Measure: compare build output size before/after

## Risks

- **Shadowing**: If shared cache expires during multi-platform generation, later platforms could get stale data. Mitigated by caching at function scope (lifecycle = one build invocation).
- **Per-platform tweaks**: If future requirements demand platform-specific skill variants, the cache design allows `mergeSkillMetadata()` to inject them. Current parity (byte-identical) means this is not an immediate risk.

## Backward Compatibility

- Platforms not in the bundled set (gc, qwen, hermes, thebird, antigravity, windsurf, jetbrains) continue using normal `loadSkillsFromSource()` path
- No API breakage: `skillsCache` is an optional config key
- Build output unchanged in content, reduced in size only

## Open Questions for Implementation

1. Should the cache be scoped to function-level (current invocation) or module-level (cached across builds)? **Decision: function-level** for safety.
2. Should `mergeSkillMetadata()` be applied during cache creation or during write? **Decision: during write** to keep cache pure and enable future per-write overrides.
