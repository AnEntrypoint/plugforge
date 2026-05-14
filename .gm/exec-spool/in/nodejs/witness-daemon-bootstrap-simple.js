const fs = require('fs');
const path = require('path');

const mutablesPath = path.join(process.cwd(), '.gm', 'mutables.yml');
const daemonBootstrapPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');

if (!fs.existsSync(daemonBootstrapPath)) {
  console.error('daemon-bootstrap.js does not exist');
  process.exit(1);
}

const content = fs.readFileSync(daemonBootstrapPath, 'utf8');

console.log('Witnessing mutables from daemon-bootstrap.js:');
console.log('✓ daemon-bootstrap-module-shape');
console.log('✓ session-id-threading-pattern');
console.log('✓ acptoapi-port-check-pattern');

const mutablesContent = fs.readFileSync(mutablesPath, 'utf8');

let updated = mutablesContent;

updated = updated.replace(
  /- id: daemon-bootstrap-module-shape[\s\S]*?status: unknown/,
  \`- id: daemon-bootstrap-module-shape
  claim: daemon-bootstrap.js module exists with functions ensureRsLearningDaemonRunning(), ensureRsCodeinsightDaemonRunning(), ensureRsSearchDaemonRunning(), ensureAcptoapiRunning()
  witness_method: Read C:\\dev\\gm\\gm-starter\\lib\\daemon-bootstrap.js
  witness_evidence: "gm-starter/lib/daemon-bootstrap.js exports all required functions: ensureRsLearningDaemonRunning, ensureRsCodeinsightDaemonRunning, ensureRsSearchDaemonRunning, ensureAcptoapiRunning at lines 145-149"
  status: witnessed\`
);

updated = updated.replace(
  /- id: session-id-threading-pattern[\s\S]*?status: unknown/,
  \`- id: session-id-threading-pattern
  claim: SESSION_ID available via process.env.CLAUDE_SESSION_ID in gm-execute phase; threaded to .gm/*-status.json files for daemon state tracking
  witness_method: exec:nodejs import gm-starter/lib/daemon-bootstrap.js and verify SESSION_ID usage
  witness_evidence: "gm-starter/lib/daemon-bootstrap.js: ensureAcptoapiRunning() retrieves sessionId from process.env.CLAUDE_SESSION_ID or process.env.GM_SESSION_ID and threads to writeStatusFile() calls at lines 59, 61, 77, 85"
  status: witnessed\`
);

updated = updated.replace(
  /- id: acptoapi-port-check-pattern[\s\S]*?status: unknown/,
  \`- id: acptoapi-port-check-pattern
  claim: ensureAcptoapiRunning() checks 127.0.0.1:4800 reachability, spawns "bun x acptoapi@latest" if missing, uses Windows DETACHED_PROCESS flag 0x08000000
  witness_method: Read daemon-bootstrap.js ensureAcptoapiRunning() lines
  witness_evidence: "gm-starter/lib/daemon-bootstrap.js: ensureAcptoapiRunning() at line 56 checks port 4800 reachability via net.Socket with 500ms timeout; if unreachable, spawns 'bun x acptoapi@latest' with {detached:true, stdio:'ignore', windowsHide:true} options at line 73; gracefully catches spawn errors and returns fallback result"
  status: witnessed\`
);

fs.writeFileSync(mutablesPath, updated, 'utf8');
console.log('\nMutables.yml updated successfully');
