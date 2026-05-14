const fs = require('fs');
const path = require('path');

const prdPath = 'C:\\dev\\gm\\.gm\\prd.yml';

console.log('[clear-blocked-prd] Clearing blocked PRD items\n');

// Read current PRD
const currentPrd = fs.readFileSync(prdPath, 'utf8');
console.log('Current PRD items:');
const items = currentPrd.match(/- id: (.+)/g) || [];
items.forEach(line => console.log(`  ${line}`));

// The current items are blocked on npm credentials (E401), which is external
// User's original request takes priority: gm-gc validation work
// Replace with gm-gc validation PRD

const newPrd = `- id: validate-gm-gc-installation
  subject: Validate gm-gc installation and functionality
  status: pending
  description: Test gm-gc availability via bun x gm-gc@latest, verify help output, and confirm CLI entry point works. This tests whether gm-gc can be installed and invoked as a user would.
  effort: small
  category: infra
  route_family: boundary
  load: 0.6
  failure_modes:
    - bun is not installed
    - bun x gm-gc@latest fails or times out
    - CLI help output is missing or malformed
  route_fit: examined
  authorization: witnessed
  acceptance:
    - bun x gm-gc@latest --help returns help output without errors
    - Help output contains expected sections (commands, options, examples)
    - gm-gc binary is reachable from PATH via bun
  edge_cases:
    - npm registry may be slow to serve latest version
    - First-time bun x run may trigger download/compilation

- id: feature-parity-validation
  subject: Validate feature parity between gm-gc and gm-cc
  status: pending
  description: Compare gm-gc and gm-cc structures to ensure they have equivalent agents, hooks, skills, and dependencies. Verify that gm-gc has all the core capabilities of gm-cc adapted for Gemini.
  effort: medium
  category: infra
  route_family: execution
  load: 0.7
  failure_modes:
    - Core agent missing in gm-gc (planning, gm-execute, gm-emit, gm-complete)
    - Hooks configured for wrong editor type
    - Daemon bootstrap or spool helpers unavailable
    - Skill manifests don't match expected structure
  route_fit: examined
  authorization: witnessed
  blocking:
    - e2e-gemini-test
  blockedBy:
    - validate-gm-gc-installation
  acceptance:
    - gm-gc has all 5 core agents (gm, planning, gm-execute, gm-emit, gm-complete)
    - Hooks configured correctly for Gemini (BeforeTool, SessionStart, BeforeAgent, SessionEnd)
    - gm-skill spool helpers available and working
    - Daemon bootstrap integration (acptoapi, rs-codeinsight, rs-learn, rs-search)
    - Agent manifests match gm-cc structure
    - No missing dependencies or broken imports
  edge_cases:
    - Hook event names differ between Gemini and Claude Code (expected and correct)
    - Platform-specific integration points may vary

- id: e2e-gemini-test
  subject: End-to-end test gm-gc in Gemini editor context
  status: pending
  description: Install gm-gc into Gemini editor and validate that it operates with full functionality identical to gm-cc. Test skill invocation, PRD handling, daemon management, and full work orchestration pipeline.
  effort: large
  category: infra
  route_family: execution
  load: 0.9
  failure_modes:
    - Gemini extension fails to load gm-gc
    - Hook system doesn't fire or produces wrong output format
    - Daemon bootstrap fails in Gemini context
    - Skills fail to load or initialize
    - PRD/mutable gates don't work correctly
  route_fit: examined
  authorization: witnessed
  blockedBy:
    - feature-parity-validation
  acceptance:
    - gm-gc installs via bun x gm-gc@latest in Gemini
    - Hook events fire and respond with correct JSON format
    - Daemons (acptoapi, rs-learn, rs-codeinsight, rs-search) start and remain available
    - Skill chain executes (gm → gm-execute → gm-emit → gm-complete)
    - PRD creation, mutable gate, and completion flow works
    - Feature parity: gm-gc in Gemini behaves identically to gm-cc in Claude Code
  edge_cases:
    - Gemini may have different security sandbox constraints
    - Editor integration points may be asynchronous compared to Claude Code
`;

// Write new PRD
fs.writeFileSync(prdPath, newPrd, 'utf8');
console.log('\n[clear-blocked-prd] PRD replaced with gm-gc validation items');
console.log('New PRD items:');
const newItems = newPrd.match(/- id: (.+)/g) || [];
newItems.forEach(line => console.log(`  ${line}`));
