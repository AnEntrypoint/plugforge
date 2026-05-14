const fs = require('fs');
const path = require('path');

console.log('=== rs-learn Static Verification ===\n');

const rsLearnPath = path.resolve('C:/dev/rs-learn');
let allPass = true;

console.log('1. Checking backend/mod.rs for Claude SDK removal...');
const modRsPath = path.join(rsLearnPath, 'src', 'backend', 'mod.rs');
if (!fs.existsSync(modRsPath)) {
  console.log('   ✗ backend/mod.rs not found');
  allPass = false;
} else {
  const modRs = fs.readFileSync(modRsPath, 'utf8');
  const hasClaudeCliMod = modRs.includes('mod claude_cli');
  const hasOpenAiCompat = modRs.includes('pub use openai_compat::OpenAiCompatClient');
  const hasAcpClientImpl = modRs.includes('impl AgentBackend for AcpClient');
  const nameReturnsAcptoapi = modRs.includes("\"acptoapi\"");

  console.log(`   ${!hasClaudeCliMod ? '✓' : '✗'} No claude_cli mod`);
  console.log(`   ${hasOpenAiCompat ? '✓' : '✗'} OpenAiCompatClient exported`);
  console.log(`   ${!hasAcpClientImpl ? '✓' : '✗'} No AcpClient AgentBackend impl`);
  console.log(`   ${nameReturnsAcptoapi ? '✓' : '✗'} name() returns "acptoapi"`);

  if (hasClaudeCliMod || !hasOpenAiCompat || hasAcpClientImpl || !nameReturnsAcptoapi) {
    allPass = false;
  }
}

console.log('\n2. Checking lib.rs for ClaudeCliClient export...');
const libRsPath = path.join(rsLearnPath, 'src', 'lib.rs');
if (!fs.existsSync(libRsPath)) {
  console.log('   ✗ lib.rs not found');
  allPass = false;
} else {
  const libRs = fs.readFileSync(libRsPath, 'utf8');
  const hasClaudeCliExport = libRs.includes('pub use') && libRs.includes('ClaudeCliClient');

  console.log(`   ${!hasClaudeCliExport ? '✓' : '✗'} No ClaudeCliClient export`);

  if (hasClaudeCliExport) {
    allPass = false;
  }
}

console.log('\n3. Checking Cargo.toml for anthropic/claude SDK...');
const cargoTomlPath = path.join(rsLearnPath, 'Cargo.toml');
if (!fs.existsSync(cargoTomlPath)) {
  console.log('   ✗ Cargo.toml not found');
  allPass = false;
} else {
  const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
  const hasAnthropicDep = cargoToml.includes('anthropic') || cargoToml.includes('claude-sdk');

  console.log(`   ${!hasAnthropicDep ? '✓' : '✗'} No anthropic/claude SDK dependency`);

  if (hasAnthropicDep) {
    allPass = false;
  }
}

console.log('\n4. Checking OpenAiCompatClient for env var defaults...');
const openaiCompatPath = path.join(rsLearnPath, 'src', 'backend', 'openai_compat.rs');
if (!fs.existsSync(openaiCompatPath)) {
  console.log('   ✗ openai_compat.rs not found');
  allPass = false;
} else {
  const openaiCompat = fs.readFileSync(openaiCompatPath, 'utf8');
  const has4800Default = openaiCompat.includes('127.0.0.1:4800');
  const hasOpenaiBaseUrlEnv = openaiCompat.includes('OPENAI_BASE_URL');

  console.log(`   ${has4800Default ? '✓' : '✗'} OPENAI_BASE_URL defaults to 127.0.0.1:4800`);
  console.log(`   ${hasOpenaiBaseUrlEnv ? '✓' : '✗'} Reads OPENAI_BASE_URL environment variable`);

  if (!has4800Default || !hasOpenaiBaseUrlEnv) {
    allPass = false;
  }
}

console.log('\n=== Summary ===');
if (allPass) {
  console.log('✓ All static checks passed');
  process.exit(0);
} else {
  console.log('✗ Some checks failed');
  process.exit(1);
}
