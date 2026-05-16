const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('=== Verifying Downstream Platforms ===\n');

const platforms = [
  'gm-cc',
  'gm-gc',
  'gm-oc',
  'gm-codex',
  'gm-kilo',
  'gm-qwen',
  'gm-hermes',
  'gm-thebird',
  'gm-vscode',
  'gm-cursor',
  'gm-zed',
  'gm-jetbrains',
  'gm-copilot-cli',
  'gm-antigravity',
  'gm-windsurf'
];

console.log(`Checking ${platforms.length} downstream platforms for spool-dispatch integration:\n`);

let verified = 0;
let failed = 0;

// Check each platform exists and has expected structure
const platformsWithLocalCopies = [
  'C:\\dev\\gm-cc',
  'C:\\dev\\gm-gc',
  'C:\\dev\\gm-oc',
  'C:\\dev\\gm-kilo',
  'C:\\dev\\gm-codex'
];

platformsWithLocalCopies.forEach(platformPath => {
  const name = path.basename(platformPath);
  if (fs.existsSync(platformPath)) {
    const hookPath = path.join(platformPath, 'hooks');
    const libPath = path.join(platformPath, 'lib', 'daemon-bootstrap.js');

    if (!fs.existsSync(hookPath) && fs.existsSync(libPath)) {
      console.log(`✓ ${name}`);
      console.log(`  - No hooks/ directory (spool-dispatch ready)`);
      console.log(`  - Has daemon-bootstrap.js`);
      verified++;
    } else {
      if (fs.existsSync(hookPath)) {
        console.log(`✗ ${name}: hooks/ directory still present`);
      }
      if (!fs.existsSync(libPath)) {
        console.log(`✗ ${name}: missing daemon-bootstrap.js`);
      }
      failed++;
    }
  } else {
    console.log(`⚠ ${name}: not cloned locally (cannot verify locally)`);
  }
});

console.log(`\n--- Summary ---`);
console.log(`Local platforms verified: ${verified}`);
console.log(`Local platforms with issues: ${failed}`);
console.log(`\nRemote-only platforms (${platforms.length - platformsWithLocalCopies.length}):`);

const remoteOnlyPlatforms = platforms.filter(p => {
  const localPath = `C:\\dev\\${p}`;
  return !fs.existsSync(localPath);
});

remoteOnlyPlatforms.forEach(p => {
  console.log(`  - ${p} (AnEntrypoint/${p} on GitHub)`);
});

console.log('\n✓ Verification complete');
console.log('\nNext steps:');
console.log('1. Verify CI ran successfully on gm publish workflow');
console.log('2. Check that all 15 platforms have been updated with new spool-dispatch configs');
console.log('3. Test daemon bootstrap integration in at least one platform (gm-cc)');
console.log('4. Update GitHub Pages documentation');
