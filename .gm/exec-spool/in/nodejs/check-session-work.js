const fs = require('fs');
const path = require('path');

const gmDir = 'C:\\dev\\gm\\.gm';

console.log('[check-session-work] Checking for prior session work state\n');

// Check if we're in a gm skill context
console.log('Checking skill execution markers:');
const markers = ['.gm-stop-verified', 'gm-fired-this-turn', 'needs-gm', 'residual-check-fired'];
markers.forEach(m => {
  const exists = fs.existsSync(path.join(gmDir, m));
  console.log(`  ${m}: ${exists ? 'EXISTS' : 'absent'}`);
});

// Check turn state
const turnStateFile = path.join(gmDir, 'turn-state.json');
if (fs.existsSync(turnStateFile)) {
  const turnState = JSON.parse(fs.readFileSync(turnStateFile, 'utf8'));
  console.log('\nTurn state:');
  console.log(JSON.stringify(turnState, null, 2).substring(0, 500));
}

// Check last skill invoked
const lastskillFile = path.join(gmDir, 'lastskill');
if (fs.existsSync(lastskillFile)) {
  const lastSkill = fs.readFileSync(lastskillFile, 'utf8').trim();
  console.log(`\nLast skill invoked: ${lastSkill}`);
}

// Check if there's any work in progress
console.log('\n\nChecking spool inbox for pending work:');
const inboxDir = path.join(gmDir, 'exec-spool', 'in');
if (fs.existsSync(inboxDir)) {
  const langDirs = fs.readdirSync(inboxDir);
  let totalPending = 0;
  langDirs.forEach(dir => {
    const dirPath = path.join(inboxDir, dir);
    if (fs.statSync(dirPath).isDirectory()) {
      const files = fs.readdirSync(dirPath);
      if (files.length > 0) {
        console.log(`  ${dir}/: ${files.length} pending`);
        totalPending += files.length;
      }
    }
  });
  console.log(`\nTotal pending spool tasks: ${totalPending}`);
}
