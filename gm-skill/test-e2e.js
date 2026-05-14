const path = require('path');
const fs = require('fs');

console.log('=== GM-SKILL END-TO-END TEST ===\n');

const skillsDir = path.join(__dirname, 'skills');
const skills = ['gm', 'planning', 'gm-execute', 'gm-emit', 'gm-complete', 'update-docs'];

console.log('1. Checking skill structure...\n');
let structureOk = true;

skills.forEach(skill => {
  const skillPath = path.join(skillsDir, skill);
  const indexPath = path.join(skillPath, 'index.js');
  const skillMdPath = path.join(skillPath, 'SKILL.md');

  const hasIndex = fs.existsSync(indexPath);
  const hasMd = fs.existsSync(skillMdPath);

  const status = hasIndex && hasMd ? '✓' : '✗';
  console.log(`  ${status} ${skill}`);
  console.log(`      index.js: ${hasIndex ? '✓' : '✗'} SKILL.md: ${hasMd ? '✓' : '✗'}`);

  if (!hasIndex || !hasMd) {
    structureOk = false;
  }
});

if (!structureOk) {
  console.log('\n✗ FAILED: Some skills are missing index.js or SKILL.md');
  process.exit(1);
}

console.log('\n2. Testing skill exports...\n');

let exportsOk = true;
skills.forEach(skill => {
  try {
    const skillPath = path.join(skillsDir, skill, 'index.js');
    const skillModule = require(skillPath);

    if (typeof skillModule !== 'function') {
      console.log(`  ✗ ${skill}: module.exports is not a function`);
      exportsOk = false;
    } else {
      console.log(`  ✓ ${skill}: exports async function`);
    }
  } catch (err) {
    console.log(`  ✗ ${skill}: failed to require - ${err.message}`);
    exportsOk = false;
  }
});

if (!exportsOk) {
  console.log('\n✗ FAILED: Some skill modules are not properly exported');
  process.exit(1);
}

console.log('\n3. Testing orchestration chain (async)...\n');

async function testChain() {
  try {
    const gmModule = require(path.join(skillsDir, 'gm', 'index.js'));

    const result = await gmModule({
      request: 'test task for gm-skill implementation',
      taskId: 'test-' + Date.now(),
    });

    if (!result) {
      console.log('  ✗ gm returned null');
      return false;
    }

    if (!result.phase) {
      console.log('  ✗ result missing phase');
      return false;
    }

    if (!result.context) {
      console.log('  ✗ result missing context');
      return false;
    }

    console.log(`  ✓ gm returned valid JSON`);
    console.log(`    - phase: ${result.phase}`);
    console.log(`    - nextSkill: ${result.nextSkill || 'null'}`);

    if (result.context.phases && result.context.phases.length > 0) {
      console.log(`    - chain: ${result.context.phases.map(p => p.skill).join(' → ')}`);
    }

    if (result.error) {
      console.log(`    - error: ${result.error}`);
      return false;
    }

    return true;
  } catch (err) {
    console.log(`  ✗ Chain failed: ${err.message}`);
    console.log(`    ${err.stack.split('\n')[1]}`);
    return false;
  }
}

testChain().then(success => {
  if (success) {
    console.log('\n✓ ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log('\n✗ TESTS FAILED');
    process.exit(1);
  }
}).catch(err => {
  console.error('\n✗ Fatal error:', err.message);
  process.exit(1);
});
