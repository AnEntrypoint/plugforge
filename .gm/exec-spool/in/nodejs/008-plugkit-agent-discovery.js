const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Checking agent discovery setup for hermes, cline, acpx...\n');

function findBinary(name) {
  try {
    const cmd = process.platform === 'win32' ? `where ${name}` : `which ${name}`;
    const result = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    return result.trim().split('\n')[0];
  } catch {
    return null;
  }
}

const agents = ['hermes', 'cline', 'acpx'];
const found = {};

for (const agent of agents) {
  const path = findBinary(agent);
  found[agent] = {
    installed: !!path,
    binary_path: path
  };
}

const rsPlugkitHookPath = '/c/dev/rs-plugkit/src/hook/session_start.rs';
const hookExists = fs.existsSync(rsPlugkitHookPath);

console.log(JSON.stringify({
  agent_discovery: found,
  session_start_hook_exists: hookExists,
  next_step: 'Research ACP JSON-RPC compatibility for each agent'
}, null, 2));
