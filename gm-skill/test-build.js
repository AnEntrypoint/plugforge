const gmSkill = require('./lib/index.js');

console.log('\n=== GM-SKILL BUILD TEST ===\n');

console.log('✓ Module loaded successfully');

const req = ['getSkills', 'getSkill', 'loadSkill', 'bootstrapDaemon'];
req.forEach(k => {
  const ok = typeof gmSkill[k] === 'function';
  console.log(`${ok ? '✓' : '✗'} ${k}: ${typeof gmSkill[k]}`);
  if (!ok) process.exit(1);
});

console.log('\n✓ All required functions exported');

const skills = gmSkill.getSkills();
console.log(`\n✓ getSkills() returned ${skills.length} skills:`);
skills.forEach(s => {
  console.log(`  - ${s.name}: ${s.description.substring(0, 50)}...`);
});

const gm = gmSkill.getSkill('gm');
console.log(`\n✓ getSkill('gm') returned skill with:`);
console.log(`  - name: ${gm.name}`);
console.log(`  - endToEnd: ${gm.endToEnd}`);
console.log(`  - allowedTools: [${gm.allowedTools.join(', ')}]`);
console.log(`  - compatiblePlatforms: ${gm.compatiblePlatforms.length} platforms`);

console.log('\n=== BUILD VERIFICATION COMPLETE ===\n');
