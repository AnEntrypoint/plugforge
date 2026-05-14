const path = require('path');

const skillPath = 'C:\\dev\\gm\\gm-skill';
const indexPath = path.join(skillPath, 'index.js');

try {
  const gmSkill = require(indexPath);

  console.log('✓ gm-skill/index.js imported successfully');
  console.log('Top-level exports:', Object.keys(gmSkill).sort());

  const daemonFunctions = ['checkState', 'spawn', 'waitForReady', 'getSocket', 'shutdown'];
  const present = daemonFunctions.filter(fn => gmSkill[fn]);

  console.log(`✓ Found ${present.length}/${daemonFunctions.length} daemon functions via index.js`);
  console.log('  Present:', present);

  const missing = daemonFunctions.filter(fn => !gmSkill[fn]);
  if (missing.length > 0) {
    console.error('✗ Missing:', missing);
    process.exit(1);
  }

  const hasEmitEvent = !!gmSkill.emitEvent;
  const hasIsDaemonRunning = !!gmSkill.isDaemonRunning;
  const hasCheckPortReachable = !!gmSkill.checkPortReachable;

  console.log('✓ Helper functions also exported:');
  console.log('  emitEvent:', hasEmitEvent);
  console.log('  isDaemonRunning:', hasIsDaemonRunning);
  console.log('  checkPortReachable:', hasCheckPortReachable);

  console.log('\n✓ gm-skill exports verification PASSED');
} catch (e) {
  console.error('✗ Failed to import gm-skill:', e.message);
  console.error(e.stack);
  process.exit(1);
}
