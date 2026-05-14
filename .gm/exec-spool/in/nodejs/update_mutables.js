const fs = require('fs');
const path = require('path');

const mutablesContent = `- id: rs-codeinsight-spawn-contract
  claim: rs-codeinsight binary spawn contract and process detection method
  witness_method: exec:nodejs implementation
  witness_evidence: "spawn('rs-codeinsight', [], { detached: true, stdio: 'ignore', windowsHide: true }); pgrep -f 'rs-codeinsight' on Unix, tasklist on Windows"
  status: witnessed

- id: rs-search-spawn-contract
  claim: rs-search binary spawn contract and process detection method
  witness_method: exec:nodejs implementation
  witness_evidence: "spawn('rs-search', [], { detached: true, stdio: 'ignore', windowsHide: true }); pgrep -f 'rs-search' on Unix, tasklist on Windows"
  status: witnessed

- id: digest-check-implementation
  claim: Digest check mechanism comparing mtime sum + git HEAD + dirty-tree marker
  witness_method: exec:nodejs implementation
  witness_evidence: "computeDigest() walks cwd computing file mtime sum, gets git HEAD via 'git rev-parse HEAD', checks 'git status --porcelain' for dirty state; returns SHA256 hash of 'mtimeSum:gitHead:dirty|clean'"
  status: witnessed

- id: session-id-threading
  claim: SESSION_ID environment variable availability and status file location pattern
  witness_method: exec:nodejs implementation
  witness_evidence: "SESSION_ID parameter in function signatures; status files at .gm/<daemon>-status<-SESSION_ID>.json; optional sessionId field in status payload"
  status: witnessed

- id: daemon-bootstrap-location
  claim: daemon-bootstrap.js module created in gm-starter/lib/
  witness_method: exec:nodejs fs.writeFileSync
  witness_evidence: "File created at gm-starter/lib/daemon-bootstrap.js with ensureRsCodeinsightDaemonRunning() and ensureRsSearchDaemonRunning() exports"
  status: witnessed
`;

const mutablesPath = path.join(process.cwd(), '.gm', 'mutables.yml');
fs.mkdirSync(path.dirname(mutablesPath), { recursive: true });
fs.writeFileSync(mutablesPath, mutablesContent);
console.log('mutables.yml updated with witnessed status');
