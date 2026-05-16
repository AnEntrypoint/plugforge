const fs = require('fs');
const path = require('path');

const strategy = {
  phase: "EXECUTE: Maximum-effort consolidation",
  repos_involved: [
    "C:\\dev\\rs-plugkit",
    "C:\\dev\\rs-exec",
    "C:\\dev\\rs-learn",
    "C:\\dev\\rs-codeinsight",
    "C:\\dev\\rs-search",
    "C:\\dev\\gm",
    "C:\\dev\\acptoapi"
  ],

  stages: [
    {
      stage: "1-rs-plugkit-spool-first",
      changes: [
        "Remove all src/hook/*.rs modules (session_start, pre_tool_use, prompt_submit, post_tool_use, stop, session_end)",
        "Rewrite main.rs: eliminate Hook subcommand, wire spool watcher as the dispatch engine",
        "Marker-file schema: prd.yml, mutables.yml, needs-gm, gm-fired-<id>, daemon-state.json, session-<id>.json",
        "Spool watcher loop: watch .gm/exec-spool/in/, dispatch to rs-exec, stream to out/",
        "Gate logic: marker files instead of hook denials (throw Error with message)",
        "Add wasm32-unknown-unknown target (already conditional in Cargo.toml)",
        "CI: replace win/linux/darwin/aarch64 matrix with single wasm build"
      ],
      critical_files: [
        "src/main.rs",
        "src/lib.rs",
        "src/spool/mod.rs (expand existing spool)",
        "Cargo.toml (no changes needed, already has wasm feature)",
        ".github/workflows/release.yml (simplify to wasm only)"
      ],
      effort: "large"
    },

    {
      stage: "2-rs-exec-spool-dispatch",
      changes: [
        "Wire as spool handler: in/runner/<N>.txt → process → out/<N>.json",
        "RPC: tail, watch, getTask, deleteTask (session-scoped, verify sessionId)",
        "Daemon stdout/stderr capture: write to out/<N>.out + out/<N>.err line-by-line",
        "Add wasm target",
        "CI: wasm only"
      ],
      critical_files: [
        "src/bin/main.rs (spool handler entry)",
        "src/rpc.rs (sessionId verification)",
        ".github/workflows/release.yml"
      ],
      effort: "medium"
    },

    {
      stage: "3-rs-learn-acptoapi",
      changes: [
        "Spawn acptoapi daemon via spool (in/runner/<N>.txt)",
        "Detect available agents: kilo, opencode, hermes, others",
        "Fallback chain: acptoapi → kilo → opencode → Anthropic SDK",
        "Test all 4 providers for recall, embeddings, ranking",
        "Fallback to AGENTS.md on failure",
        "Exfiltrate memory to rs-learn.db on success",
        "Add wasm target",
        "CI: wasm only"
      ],
      critical_files: [
        "src/provider.rs (acptoapi provider rewrite)",
        "src/agent.rs (agent detection + spawn)",
        ".github/workflows/release.yml"
      ],
      effort: "large"
    },

    {
      stage: "4-rs-codeinsight-wasm",
      changes: [
        "Add wasm target",
        "Verify parity with os binary",
        "CI: wasm only"
      ],
      critical_files: [
        "Cargo.toml",
        ".github/workflows/release.yml"
      ],
      effort: "small"
    },

    {
      stage: "5-rs-search-wasm",
      changes: [
        "Add wasm target",
        "Verify parity with os binary",
        "CI: wasm only"
      ],
      critical_files: [
        "Cargo.toml",
        ".github/workflows/release.yml"
      ],
      effort: "small"
    },

    {
      stage: "6-gm-starter-spool-lib",
      changes: [
        "Rewrite lib/spool-dispatch.js: marker-file aware, spool result callbacks",
        "Rewrite lib/daemon-bootstrap.js: spawn via spool, not direct exec",
        "Remove hook generation from lib/template-builder.js",
        "Gate logic: marker file checks, no hook denials",
        "WASM bootstrap: download, cache, sha256 verify",
        "acptoapi integration: spawn and detect agents"
      ],
      critical_files: [
        "gm-starter/lib/spool-dispatch.js",
        "gm-starter/lib/daemon-bootstrap.js",
        "gm-starter/lib/template-builder.js",
        "gm-starter/bin/bootstrap.js"
      ],
      effort: "large"
    },

    {
      stage: "7-gm-platform-generation",
      changes: [
        "Remove hooks/ directory generation",
        "Add .gm/ marker init logic",
        "Spool-first dispatch in platform scripts",
        "WASM binary invocation (bun/node)",
        "Regenerate all 12 platforms"
      ],
      critical_files: [
        "platforms/*.js (all adapters)"
      ],
      effort: "large"
    },

    {
      stage: "8-website-docs",
      changes: [
        "Update AGENTS.md: remove hook references, document spool dispatch",
        "Update docs/: remove hook diagrams, add spool-first flow",
        "Update landing page: highlight polymorphism, simplicity",
        "Remove stale skill/hook documentation"
      ],
      critical_files: [
        "AGENTS.md",
        "docs/index.html",
        "site/content/pages/home.yaml",
        "site/theme.mjs"
      ],
      effort: "medium"
    },

    {
      stage: "9-validation",
      changes: [
        "Test spool dispatch: nodejs, bash, codesearch, recall, learn tasks",
        "Validate all ACP agents: kilo, opencode, hermes, Anthropic SDK",
        "Test WASM binaries: parity with OS binaries",
        "Test all 12 platforms: spool init, skill chain, daemon spawn",
        "End-to-end: code search, learning, no hooks"
      ],
      critical_files: [
        "test.js (consolidate validation into 200-line test)"
      ],
      effort: "large"
    },

    {
      stage: "10-cascade",
      changes: [
        "Push rs-plugkit → CI builds wasm, bumps version",
        "gm publishes wasm binary to Releases",
        "gm pushes → all 12 platforms regenerate and publish",
        "Verify no hook errors, all platforms work"
      ],
      critical_files: [
        ".github/workflows/ (all repos)"
      ],
      effort: "medium"
    }
  ],

  fallback_strategy: {
    description: "If learning fails, fallback to AGENTS.md as cache",
    implementation: [
      "rs-learn: on acptoapi/kilo/opencode failure, read AGENTS.md as fallback memory",
      "memorize: always writes both rs-learn.db AND AGENTS.md on success",
      "recall: try rs-learn first, fallback to AGENTS.md on socket error",
      "Test: verify fallback works when rs-learn unavailable"
    ]
  },

  validation_checklist: [
    "✓ Spool watcher runs on session start (not via hook)",
    "✓ Marker files drive state transitions (not hook events)",
    "✓ rs-plugkit builds only wasm (no os binaries)",
    "✓ rs-learn spawns acptoapi and detects agents",
    "✓ kilo/opencode work as free fallbacks",
    "✓ AGENTS.md fallback works when learning unavailable",
    "✓ All 12 platforms initialize and run skill chain",
    "✓ gm.json pinned wasm version matches built binary",
    "✓ CI cascade: push rs-plugkit → wasm built → gm published → 12 platforms deploy",
    "✓ End-to-end: no hook prompts, spool-driven dispatch"
  ]
};

console.log(JSON.stringify(strategy, null, 2));
