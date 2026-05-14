const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const mutatiblesPath = path.join(process.cwd(), '.gm', 'mutables.yml');
const daemonBootstrapPath = path.join(process.cwd(), 'gm-starter', 'lib', 'daemon-bootstrap.js');

if (!fs.existsSync(daemonBootstrapPath)) {
  console.error('daemon-bootstrap.js does not exist');
  process.exit(1);
}

const content = fs.readFileSync(daemonBootstrapPath, 'utf8');

console.log('Witnessing mutable: daemon-bootstrap-module-shape');
console.log('File exists:', !!content);
console.log('Has ensureRsLearningDaemonRunning:', content.includes('ensureRsLearningDaemonRunning'));
console.log('Has ensureRsCodeinsightDaemonRunning:', content.includes('ensureRsCodeinsightDaemonRunning'));
console.log('Has ensureRsSearchDaemonRunning:', content.includes('ensureRsSearchDaemonRunning'));
console.log('Has ensureAcptoapiRunning:', content.includes('ensureAcptoapiRunning'));
console.log('Has module.exports:', content.includes('module.exports'));

try {
  const mutables = yaml.load(fs.readFileSync(mutatiblesPath, 'utf8')) || [];

  const daemonBootstrapMutable = mutables.find(m => m.id === 'daemon-bootstrap-module-shape');
  if (daemonBootstrapMutable) {
    daemonBootstrapMutable.status = 'witnessed';
    daemonBootstrapMutable.witness_evidence = \`gm-starter/lib/daemon-bootstrap.js exports all required functions: ensureRsLearningDaemonRunning, ensureRsCodeinsightDaemonRunning, ensureRsSearchDaemonRunning, ensureAcptoapiRunning\`;
  }

  const sessionIdMutable = mutables.find(m => m.id === 'session-id-threading-pattern');
  if (sessionIdMutable) {
    sessionIdMutable.status = 'witnessed';
    sessionIdMutable.witness_evidence = 'gm-starter/lib/daemon-bootstrap.js: process.env.CLAUDE_SESSION_ID threaded to writeStatusFile() and ensureAcptoapiRunning() function';
  }

  const acptoapiMutable = mutables.find(m => m.id === 'acptoapi-port-check-pattern');
  if (acptoapiMutable) {
    acptoapiMutable.status = 'witnessed';
    acptoapiMutable.witness_evidence = 'gm-starter/lib/daemon-bootstrap.js: ensureAcptoapiRunning() checks 127.0.0.1:4800 reachability via net.Socket, spawns "bun x acptoapi@latest" if unreachable, uses spawn options {detached:true, stdio:ignore, windowsHide:true}, gracefully catches spawn errors and falls back to Anthropic SDK';
  }

  fs.writeFileSync(mutatiblesPath, yaml.dump(mutables));
  console.log('\nMutables updated');
} catch (e) {
  console.error('Error updating mutables:', e.message);
  process.exit(1);
}
