const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const hooks = require('../../lib/hook-bridge.js');

async function emitSkill(input, parentContext) {
  const context = parentContext || {
    request: input.request || '',
    taskId: input.taskId || require('crypto').randomUUID(),
    sessionId: process.env.SESSION_ID || require('crypto').randomUUID(),
  };

  const gmDir = path.join(process.cwd(), '.gm');
  const prdPath = path.join(gmDir, 'prd.yml');

  console.error(`[gm-emit] EMIT phase starting`);
  hooks.preToolUse();

  let prd = [];

  try {
    if (fs.existsSync(prdPath)) {
      const prdContent = fs.readFileSync(prdPath, 'utf8');
      prd = yaml.load(prdContent) || [];
    }
  } catch (err) {
    console.error(`[gm-emit] ERROR reading prd.yml:`, err.message);
  }

  console.error(`[gm-emit] PRD has ${prd.length} items`);

  const incompleteItems = prd.filter(item => item.status !== 'completed');
  if (incompleteItems.length > 0) {
    console.error(`[gm-emit] Found ${incompleteItems.length} incomplete items, returning to EXECUTE`);
    return {
      nextSkill: 'gm-execute',
      context,
      phase: 'EMIT',
    };
  }

  console.error(`[gm-emit] All PRD items completed, proceeding with EMIT`);

  const emittedFiles = [];

  try {
    if (!fs.existsSync(gmDir)) {
      fs.mkdirSync(gmDir, { recursive: true });
    }

    const stateFile = path.join(gmDir, 'emit-state.json');
    const emitState = {
      timestamp: new Date().toISOString(),
      filesWritten: emittedFiles,
      prdCount: prd.length,
      allCompleted: true,
    };

    fs.writeFileSync(stateFile, JSON.stringify(emitState, null, 2), 'utf8');
    emittedFiles.push(stateFile);

    console.error(`[gm-emit] Wrote ${emittedFiles.length} files`);
  } catch (err) {
    console.error(`[gm-emit] ERROR during emit:`, err.message);
    return {
      nextSkill: null,
      context,
      phase: 'ERROR',
      error: `EMIT failed: ${err.message}`,
    };
  }

  context.prd = prd;
  hooks.postToolUse();

  return {
    nextSkill: 'gm-complete',
    context,
    phase: 'EMIT',
  };
}

if (require.main === module) {
  const input = { request: process.argv[2] || 'default task' };
  emitSkill(input).then(result => {
    console.log(JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = emitSkill;
