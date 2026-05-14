const fs = require('fs');
const path = require('path');

const rsLearnPath = 'C:/dev/rs-learn';

console.log('=== RS-LEARN STATIC VERIFICATION ===\n');

const modContent = fs.readFileSync(path.join(rsLearnPath, 'src/backend/mod.rs'), 'utf8');
const libContent = fs.readFileSync(path.join(rsLearnPath, 'src/lib.rs'), 'utf8');
const compatContent = fs.readFileSync(path.join(rsLearnPath, 'src/backend/openai_compat.rs'), 'utf8');
const cargoContent = fs.readFileSync(path.join(rsLearnPath, 'Cargo.toml'), 'utf8');

const checks = [
  ['no claude_cli mod', !modContent.includes('mod claude_cli')],
  ['no ClaudeCliClient in mod.rs', !modContent.includes('ClaudeCliClient')],
  ['no AcpClient impl', !modContent.includes('impl AgentBackend for AcpClient')],
  ['OpenAiCompatClient impl present', modContent.includes('impl AgentBackend for OpenAiCompatClient')],
  ['name() returns "acptoapi"', modContent.includes('fn name(&self) -> &\'static str { "acptoapi" }')],
  ['no ClaudeCliClient export', !libContent.includes('ClaudeCliClient')],
  ['AgentBackend exported', libContent.includes('pub use backend::AgentBackend')],
  ['OPENAI_BASE_URL env read', compatContent.includes('OPENAI_BASE_URL')],
  ['default to 127.0.0.1:4800', compatContent.includes('127.0.0.1:4800')],
  ['/v1/chat/completions endpoint', compatContent.includes('/v1/chat/completions')],
  ['no anthropic dependency', !cargoContent.includes('anthropic')],
  ['reqwest HTTP client', cargoContent.includes('reqwest')],
];

let passed = 0;
checks.forEach(([name, result]) => {
  const icon = result ? '✓' : '✗';
  console.log(`${icon} ${name}`);
  if (result) passed++;
});

console.log(`\nPassed: ${passed}/${checks.length}`);
if (passed === checks.length) {
  console.log('\n✓ ALL STATIC CHECKS PASSED');
  process.exit(0);
} else {
  console.error('\n✗ SOME CHECKS FAILED');
  process.exit(1);
}
