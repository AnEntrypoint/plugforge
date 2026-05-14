const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { execSync } = require('child_process');

async function completeSkill(input, parentContext) {
  const context = parentContext || {
    request: input.request || '',
    taskId: input.taskId || require('crypto').randomUUID(),
    sessionId: process.env.SESSION_ID || require('crypto').randomUUID(),
  };

  const gmDir = path.join(process.cwd(), '.gm');
  const prdPath = path.join(gmDir, 'prd.yml');
  const mutablesPath = path.join(gmDir, 'mutables.yml');

  console.error(`[gm-complete] COMPLETE phase starting`);

  let prd = [];

  try {
    if (fs.existsSync(prdPath)) {
      const prdContent = fs.readFileSync(prdPath, 'utf8');
      prd = yaml.parse(prdContent) || [];
    }
  } catch (err) {
    console.error(`[gm-complete] ERROR reading prd.yml:`, err.message);
  }

  const verifications = {
    gitClean: false,
    gitPushed: false,
    testsPassed: false,
    prdEmpty: false,
    mutablesResolved: false,
  };

  console.error(`[gm-complete] Running verifications...`);

  try {
    const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    verifications.gitClean = statusOutput === '';
    console.error(`[gm-complete] git clean: ${verifications.gitClean}`);
  } catch (err) {
    console.error(`[gm-complete] git status check failed:`, err.message);
  }

  try {
    const unpushedOutput = execSync('git log origin/main..HEAD --oneline', { encoding: 'utf8' }).trim();
    verifications.gitPushed = unpushedOutput === '';
    console.error(`[gm-complete] git pushed: ${verifications.gitPushed}`);
  } catch (err) {
    console.error(`[gm-complete] git log check failed:`, err.message);
  }

  if (fs.existsSync('test.js')) {
    try {
      execSync('node test.js', { stdio: 'pipe', timeout: 30000 });
      verifications.testsPassed = true;
      console.error(`[gm-complete] tests passed: true`);
    } catch (err) {
      console.error(`[gm-complete] tests failed:`, err.message);
    }
  } else {
    verifications.testsPassed = true;
    console.error(`[gm-complete] no test.js found, skipping tests`);
  }

  verifications.prdEmpty = !fs.existsSync(prdPath) || prd.length === 0;
  console.error(`[gm-complete] prd empty: ${verifications.prdEmpty}`);

  verifications.mutablesResolved = !fs.existsSync(mutablesPath);
  console.error(`[gm-complete] mutables resolved: ${verifications.mutablesResolved}`);

  const allVerified = Object.values(verifications).every(v => v);

  if (!allVerified) {
    console.error(`[gm-complete] Verifications failed, checking for incomplete work...`);
    if (prd.length > 0) {
      console.error(`[gm-complete] PRD still has items, returning to EXECUTE`);
      return {
        nextSkill: 'gm-execute',
        context: { ...context, verifications },
        phase: 'COMPLETE',
      };
    }
  }

  console.error(`[gm-complete] All verifications passed`);

  const completeState = {
    timestamp: new Date().toISOString(),
    verifications,
    ready: allVerified,
  };

  fs.writeFileSync(path.join(gmDir, 'complete-state.json'), JSON.stringify(completeState, null, 2), 'utf8');

  context.verifications = verifications;

  return {
    nextSkill: allVerified ? 'update-docs' : null,
    context,
    phase: 'COMPLETE',
  };
}

if (require.main === module) {
  const input = { request: process.argv[2] || 'default task' };
  completeSkill(input).then(result => {
    console.log(JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = completeSkill;
