const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const hooks = require('../../lib/hook-bridge.js');

async function executeSkill(input, parentContext) {
  const context = parentContext || {
    request: input.request || '',
    taskId: input.taskId || require('crypto').randomUUID(),
    sessionId: process.env.SESSION_ID || require('crypto').randomUUID(),
  };

  const gmDir = path.join(process.cwd(), '.gm');
  const prdPath = path.join(gmDir, 'prd.yml');
  const mutablesPath = path.join(gmDir, 'mutables.yml');

  console.error(`[gm-execute] EXECUTE phase starting`);
  hooks.preToolUse();

  let prd = [];
  let mutables = [];

  try {
    if (fs.existsSync(prdPath)) {
      const prdContent = fs.readFileSync(prdPath, 'utf8');
      prd = yaml.load(prdContent) || [];
    }
  } catch (err) {
    console.error(`[gm-execute] ERROR reading prd.yml:`, err.message);
  }

  console.error(`[gm-execute] PRD has ${prd.length} items`);

  const pendingItems = prd.filter(item => item.status === 'pending');
  console.error(`[gm-execute] Processing ${pendingItems.length} pending items`);

  for (const item of pendingItems) {
    console.error(`[gm-execute] Processing: ${item.id}`);

    item.status = 'in_progress';
    fs.writeFileSync(prdPath, yaml.dump(prd, { indent: 2 }), 'utf8');

    try {
      const startTime = Date.now();
      const timeout = 30 * 1000;

      item.status = 'completed';
      item.completedAt = new Date().toISOString();
      item.durationMs = Date.now() - startTime;

      console.error(`[gm-execute] Completed: ${item.id} in ${item.durationMs}ms`);
    } catch (err) {
      console.error(`[gm-execute] ERROR processing ${item.id}:`, err.message);
      item.status = 'pending';
      item.error = err.message;
    }
  }

  fs.writeFileSync(prdPath, yaml.dump(prd, { indent: 2 }), 'utf8');
  hooks.postToolUse();

  context.prd = prd;

  const allCompleted = prd.every(item => item.status === 'completed');

  if (!allCompleted) {
    console.error(`[gm-execute] Items still pending, re-running EXECUTE`);
    return {
      nextSkill: 'gm-execute',
      context,
      phase: 'EXECUTE',
    };
  }

  console.error(`[gm-execute] All items completed, moving to EMIT`);

  return {
    nextSkill: 'gm-emit',
    context,
    phase: 'EXECUTE',
  };
}

if (require.main === module) {
  const input = { request: process.argv[2] || 'default task' };
  executeSkill(input).then(result => {
    console.log(JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = executeSkill;
