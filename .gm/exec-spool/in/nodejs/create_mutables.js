const fs = require('fs');
const path = require('path');

const mutablesContent = `- id: rs-codeinsight-spawn-contract
  claim: rs-codeinsight binary spawn contract and process detection method
  witness_method: exec:codesearch rs-codeinsight binary spawn
  witness_evidence: ""
  status: unknown

- id: rs-search-spawn-contract
  claim: rs-search binary spawn contract and process detection method
  witness_method: exec:codesearch rs-search daemon spawn
  witness_evidence: ""
  status: unknown

- id: digest-check-implementation
  claim: Digest check mechanism comparing mtime sum + git HEAD + dirty-tree marker
  witness_method: exec:codesearch digest mtime git
  witness_evidence: ""
  status: unknown

- id: session-id-threading
  claim: SESSION_ID environment variable availability and status file location pattern
  witness_method: exec:codesearch SESSION_ID status file
  witness_evidence: ""
  status: unknown

- id: daemon-bootstrap-location
  claim: daemon-bootstrap.js module exists or needs creation in gm-starter/lib/
  witness_method: exec:nodejs fs.existsSync check
  witness_evidence: ""
  status: unknown
`;

const mutablesPath = path.join(process.cwd(), '.gm', 'mutables.yml');
fs.mkdirSync(path.dirname(mutablesPath), { recursive: true });
fs.writeFileSync(mutablesPath, mutablesContent);
console.log('mutables.yml created');
