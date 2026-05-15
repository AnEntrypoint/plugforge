const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const hooks = require('../../lib/hook-bridge.js');
const spool = require('../../lib/spool.js');

// Platform-specific skills that are auto-generated per platform adapter.
// These are reference SKILL.md entries; their index.js implementations
// are provided by gm-starter/skills/ at build time.
const PLATFORM_SKILLS = [
  'gm-cc', 'gm-gc', 'gm-codex', 'gm-copilot-cli', 'gm-cursor',
  'gm-jetbrains', 'gm-kilo', 'gm-oc', 'gm-vscode', 'gm-zed'
];

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

  try {
    if (fs.existsSync(mutablesPath)) {
      const mutContent = fs.readFileSync(mutablesPath, 'utf8');
      mutables = yaml.load(mutContent) || [];
    }
  } catch (err) {
    console.error(`[gm-execute] ERROR reading mutables.yml:`, err.message);
  }

  console.error(`[gm-execute] PRD has ${prd.length} items, ${mutables.length} mutables`);

  const pendingItems = prd.filter(item => item.status === 'pending');
  console.error(`[gm-execute] Processing ${pendingItems.length} pending items`);

  // Execute pending items with spool dispatch
  for (const item of pendingItems) {
    console.error(`[gm-execute] Processing: ${item.id}`);
    item.status = 'in_progress';
    item.startedAt = new Date().toISOString();
    fs.writeFileSync(prdPath, yaml.dump(prd, { indent: 2 }), 'utf8');

    try {
      const startTime = Date.now();

      // If item has an execSpool target, dispatch it via the spool watcher
      if (item.execSpool) {
        const result = await spool.execSpool(item.execSpool.body, item.execSpool.lang || 'nodejs', {
          timeoutMs: item.timeoutMs || 30000,
          sessionId: context.sessionId,
        });
        item.spoolResult = result;
        if (!result.ok) {
          item.status = 'failed';
          item.error = result.stderr || result.stdout || 'spool execution failed';
        }
      }

      // If item has a discoverable spool task (written to .gm/exec-spool/in by the agent),
      // the watcher will pick it up automatically. We just wait for the output here.
      if (item.spoolTaskId) {
        const result = await spool.waitForCompletion(item.spoolTaskId, item.timeoutMs || 30000);
        item.spoolResult = result;
        if (!result.ok) {
          item.status = 'failed';
          item.error = result.stderr || 'spool task timed out or failed';
        }
      }

      if (!item.error) {
        item.status = 'completed';
      }

      item.completedAt = new Date().toISOString();
      item.durationMs = Date.now() - startTime;

      console.error(`[gm-execute] ${item.id}: ${item.status} in ${item.durationMs}ms`);
    } catch (err) {
      console.error(`[gm-execute] ERROR processing ${item.id}:`, err.message);
      item.status = 'pending';
      item.error = err.message;
    }
  }

  fs.writeFileSync(prdPath, yaml.dump(prd, { indent: 2 }), 'utf8');
  hooks.postToolUse();

  context.prd = prd;
  context.mutables = mutables;

  // Check for unresolved mutables
  const unresolvedMutables = mutables.filter(m =>
    String(m.status || '').toLowerCase() !== 'witnessed'
  );

  const allCompleted = prd.every(item => item.status === 'completed');

  if (!allCompleted || unresolvedMutables.length > 0) {
    console.error(`[gm-execute] ${unresolvedMutables.length} mutables unresolved, looping back`);
    return {
      nextSkill: unresolvedMutables.length > 0 ? 'gm-execute' : 'gm-execute',
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