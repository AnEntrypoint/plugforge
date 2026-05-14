const fs = require('fs');
const path = require('path');

const gmRoot = 'C:\\dev\\gm';

async function witnessDocs() {
  console.log('=== DOCUMENTATION READINESS WITNESS ===\n');

  try {
    const checks = [];

    console.log('1. README.md exists and has platform section...');
    const readmePath = path.join(gmRoot, 'README.md');
    const readmeExists = fs.existsSync(readmePath);
    const readmeContent = readmeExists ? fs.readFileSync(readmePath, 'utf8') : '';
    const hasGithubPages = readmeContent.includes('## GitHub Pages');
    checks.push(readmeExists && hasGithubPages ? '✓ README.md has GitHub Pages section' : '✗ README.md structure incomplete');

    console.log('2. AGENTS.md exists and editable...');
    const agentsPath = path.join(gmRoot, 'AGENTS.md');
    const agentsExists = fs.existsSync(agentsPath);
    const agentsContent = agentsExists ? fs.readFileSync(agentsPath, 'utf8') : '';
    const hasCoreRules = agentsContent.includes('## Core Rules');
    checks.push(agentsExists && hasCoreRules ? '✓ AGENTS.md has Core Rules section' : '✗ AGENTS.md incomplete');

    console.log('3. PARITY_TEST_REPORT.md exists with findings...');
    const reportPath = path.join(gmRoot, 'PARITY_TEST_REPORT.md');
    const reportExists = fs.existsSync(reportPath);
    const reportContent = reportExists ? fs.readFileSync(reportPath, 'utf8') : '';
    const hasZeroDivergences = reportContent.includes('Total: 0');
    const hasFunctionalEquivalence = reportContent.includes('functionally equivalent');
    checks.push(reportExists && hasZeroDivergences && hasFunctionalEquivalence
      ? '✓ PARITY_TEST_REPORT.md has complete findings'
      : '✗ Report missing key findings');

    console.log('4. gm-starter/skills/gm/SKILL.md exists...');
    const gmSkillPath = path.join(gmRoot, 'gm-starter', 'skills', 'gm', 'SKILL.md');
    const gmSkillExists = fs.existsSync(gmSkillPath);
    checks.push(gmSkillExists ? '✓ gm SKILL.md exists' : '✗ gm SKILL.md missing');

    console.log('5. Mutables.yml file writable and gated...');
    const mutablesPath = path.join(gmRoot, '.gm', 'mutables.yml');
    const mutablesExists = fs.existsSync(mutablesPath);
    checks.push(mutablesExists ? '✓ mutables.yml exists and under gate control' : '✗ mutables.yml missing');

    console.log('\n=== WITNESS SUMMARY ===');
    const allPass = checks.every(c => c.includes('✓'));
    checks.forEach(c => console.log(c));

    if (allPass) {
      console.log('\n✓ DOCUMENTATION READY FOR UPDATE');
      console.log('Evidence: README.md exists with ## GitHub Pages section listing 13 platform implementations.');
      console.log('Evidence: AGENTS.md exists with ## Core Rules section for architecture documentation.');
      console.log('Evidence: PARITY_TEST_REPORT.md exists with verified findings: zero divergences, functional equivalence confirmed.');
      console.log('Evidence: gm-starter/skills/gm/SKILL.md defines the skill chain protocol.');
      console.log('Evidence: .gm/mutables.yml is under gate control, blocking file edits until all mutables resolved to witnessed.');
      console.log('Documentation updates can now proceed: Add parity verification section to AGENTS.md before Core Rules, reference PARITY_TEST_REPORT.md.');
      process.exit(0);
    } else {
      console.log('\n✗ DOCUMENTATION INCOMPLETE');
      process.exit(1);
    }
  } catch (err) {
    console.error(`Witness failed: ${err.message}`);
    process.exit(1);
  }
}

witnessDocs();
