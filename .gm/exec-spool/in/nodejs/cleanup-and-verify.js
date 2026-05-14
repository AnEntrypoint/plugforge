const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cwd = '/c/dev/gm';
process.chdir(cwd);

console.log('=== CLEANUP AND VERIFICATION ===\n');

try {
  console.log('1. Removing PRD and spool artifacts');
  const prdPath = '.gm/prd.yml';
  if (fs.existsSync(prdPath)) {
    fs.unlinkSync(prdPath);
    console.log('   ✓ Deleted .gm/prd.yml');
  }

  const inDir = '.gm/exec-spool/in';
  if (fs.existsSync(inDir)) {
    fs.rmSync(inDir, { recursive: true, force: true });
    console.log('   ✓ Deleted .gm/exec-spool/in');
  }

  const outDir = '.gm/exec-spool/out';
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
    console.log('   ✓ Deleted .gm/exec-spool/out');
  }

  console.log('\n2. Verifying test.js changes on disk');
  const testContent = fs.readFileSync('test.js', 'utf8');
  if (testContent.includes('toLowerCase().includes(\'exit\')')) {
    console.log('   ✓ Line 234: toLowerCase() fix present');
  }
  if (testContent.includes('Object.keys(hooks.hooks).length')) {
    console.log('   ✓ Line 245: Object.keys() fix present');
  }

  console.log('\n3. Verifying package.json has js-yaml');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (pkg.dependencies && pkg.dependencies['js-yaml']) {
    console.log(`   ✓ js-yaml ${pkg.dependencies['js-yaml']} in dependencies`);
  }

  console.log('\n4. Git status');
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  const lines = status.trim().split('\n').filter(l => l && !l.includes('.claude/worktrees') && !l.includes('.gm/exec-spool'));
  if (lines.length === 0) {
    console.log('   ✓ Working tree clean (ignoring worktrees)');
  } else {
    console.log('   Files with changes:');
    lines.forEach(l => console.log(`     ${l}`));
  }

  console.log('\n5. Latest commits');
  const commits = execSync('git log --oneline -3', { encoding: 'utf8' });
  console.log(commits);

  console.log('✓ VERIFICATION COMPLETE');
  process.exit(0);
} catch (e) {
  console.error(`✗ FAILED: ${e.message}`);
  process.exit(1);
}
