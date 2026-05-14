const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GM_DIR = path.join('C:', 'dev', 'gm', '.gm');
const SPOOL_DIR = path.join(GM_DIR, 'exec-spool');

try {
  // Clean exec-spool artifacts
  const inDir = path.join(SPOOL_DIR, 'in');
  const outDir = path.join(SPOOL_DIR, 'out');
  if (fs.existsSync(inDir)) {
    fs.rmSync(inDir, { recursive: true, force: true });
    console.log('Cleaned in/');
  }
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
    console.log('Cleaned out/');
  }

  // Clean stale marker files
  const prdFile = path.join(GM_DIR, 'prd.yml');
  const mutsFile = path.join(GM_DIR, 'mutables.yml');
  const residFile = path.join(GM_DIR, 'residual-check-fired');
  if (fs.existsSync(prdFile)) fs.unlinkSync(prdFile);
  if (fs.existsSync(mutsFile)) fs.unlinkSync(mutsFile);
  if (fs.existsSync(residFile)) fs.unlinkSync(residFile);
  console.log('Cleaned stale marker files');

  // Write new PRD
  const newPrd = `- id: commit-daemon-bootstrap
  subject: Commit daemon-bootstrap and hook integration
  status: in_progress
  description: Stage and commit daemon-bootstrap.js, cli-config-shared.js, package-lock.json with feat message
  effort: small
  category: feature
  route_family: execution
  load: 0.3
  failure_modes: []
  route_fit: examined
  authorization: witnessed
  blocking: []
  blockedBy: []
  acceptance:
    - daemon-bootstrap.js in git
    - cli-config-shared.js changes in git
    - package-lock.json updated
    - commit pushed to origin/main
  edge_cases: []
`;
  fs.writeFileSync(prdFile, newPrd, 'utf8');
  console.log('PRD written');

  // Stage files
  process.chdir('C:\\dev\\gm');
  execSync('git add gm-starter/lib/daemon-bootstrap.js platforms/cli-config-shared.js package-lock.json', { stdio: 'inherit' });
  console.log('Files staged');

  // Commit
  execSync('git commit -m "feat: add daemon-bootstrap for acptoapi auto-spawn"', { stdio: 'inherit' });
  console.log('Commit created');

  // Push
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('Pushed to origin/main');

  // Mark PRD item completed and clean
  fs.unlinkSync(prdFile);
  console.log('PRD cleaned');

} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
