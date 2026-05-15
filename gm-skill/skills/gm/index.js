const fs = require('fs');
const path = require('path');
const hooks = require('../../lib/hook-bridge.js');

async function gmSkill(input) {
  const context = {
    request: input.request || '',
    taskId: input.taskId || require('crypto').randomUUID(),
    sessionId: process.env.SESSION_ID || require('crypto').randomUUID(),
    timestamp: new Date().toISOString(),
    phases: [],
    prd: [],
    mutables: {},
  };

  const skillsDir = path.dirname(__dirname);

  let currentSkill = 'planning';
  let chainDepth = 0;
  const maxDepth = 6;

  console.log(`[gm] orchestrator starting; request="${context.request}"; task=${context.taskId}`);
  hooks.skillLifecycle({ sessionStart: true, promptSubmit: true, preToolUse: false, postToolUse: false });

  while (currentSkill && chainDepth < maxDepth) {
    chainDepth++;
    console.error(`[gm] depth=${chainDepth}; invoking ${currentSkill}`);

    const skillPath = path.join(skillsDir, currentSkill, 'index.js');
    if (!fs.existsSync(skillPath)) {
      console.error(`[gm] ERROR: skill not found: ${skillPath}`);
      return {
        nextSkill: null,
        context,
        phase: 'ERROR',
        error: `Skill ${currentSkill} not found`,
      };
    }

    try {
      hooks.preToolUse();
      const skillModule = require(skillPath);
      const result = await skillModule(input, context);
      hooks.postToolUse();

      if (!result || typeof result !== 'object') {
        console.error(`[gm] ERROR: skill returned invalid result`);
        return {
          nextSkill: null,
          context,
          phase: 'ERROR',
          error: `Skill ${currentSkill} returned invalid result`,
        };
      }

      context.phases.push({
        skill: currentSkill,
        phase: result.phase,
        timestamp: new Date().toISOString(),
      });

      currentSkill = result.nextSkill || null;

      if (!currentSkill) {
        console.error(`[gm] chain complete`);
        return {
          nextSkill: null,
          context,
          phase: 'COMPLETE',
        };
      }

      input = { ...input, context };
    } catch (error) {
      console.error(`[gm] ERROR in ${currentSkill}:`, error.message);
      return {
        nextSkill: null,
        context,
        phase: 'ERROR',
        error: `${currentSkill} failed: ${error.message}`,
      };
    }
  }

  if (chainDepth >= maxDepth) {
    console.error(`[gm] ERROR: max chain depth exceeded`);
    return {
      nextSkill: null,
      context,
      phase: 'ERROR',
      error: 'Skill chain exceeded maximum depth',
    };
  }
  hooks.skillLifecycle({ sessionStart: false, promptSubmit: false, preToolUse: false, postToolUse: false, stop: true, stopGit: true });

  return {
    nextSkill: null,
    context,
    phase: 'COMPLETE',
  };
}

if (require.main === module) {
  const input = {
    request: process.argv[2] || 'test task',
    context: null,
  };

  gmSkill(input).then(result => {
    console.log(JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = gmSkill;
