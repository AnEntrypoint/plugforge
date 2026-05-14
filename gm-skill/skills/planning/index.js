const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

async function planningSkill(input, parentContext) {
  const context = parentContext || {
    request: input.request || '',
    taskId: input.taskId || require('crypto').randomUUID(),
    sessionId: process.env.SESSION_ID || require('crypto').randomUUID(),
  };

  const gmDir = path.join(process.cwd(), '.gm');
  const prdPath = path.join(gmDir, 'prd.yml');
  const mutablesPath = path.join(gmDir, 'mutables.yml');

  console.error(`[planning] PLAN phase starting`);
  console.error(`[planning] request="${context.request}"`);

  const prd = [];
  const mutables = [];

  const skillCategories = [
    {
      id: 'gm-skill-gm-skill-index',
      subject: 'Implement core skills (gm, planning, gm-execute, gm-emit, gm-complete, update-docs) as index.js modules',
      description: 'Each skill reads SKILL.md, implements logic, returns end-to-end JSON with nextSkill/context/phase',
      effort: 'large',
      category: 'feature',
      route_family: 'reasoning',
      load: 1.0,
      authorization: 'weak_prior',
      acceptance: [
        'gm/index.js parses request, invokes planning, returns nextSkill="planning"',
        'planning/index.js runs ORIENT, mutable discovery, PRD generation',
        'gm-execute/index.js parallelizes independent PRD items via subagents',
        'gm-emit/index.js writes .gm/ files, verifies from disk',
        'gm-complete/index.js verifies git state, checks tests',
        'update-docs/index.js updates README, commits and pushes',
        'All skills respect timeouts and emit clear error messages',
      ],
    },
  ];

  if (!fs.existsSync(gmDir)) {
    fs.mkdirSync(gmDir, { recursive: true });
  }

  prd.push(...skillCategories.map((item, idx) => ({
    id: item.id,
    subject: item.subject,
    status: 'pending',
    description: item.description,
    effort: item.effort,
    category: item.category,
    route_family: item.route_family,
    load: item.load,
    failure_modes: [
      'skill invocation infinite loops',
      'JSON output malformed or missing nextSkill',
      'context not passed between skills',
      'mutable resolution never completes',
      'async operations timeout',
    ],
    route_fit: 'examined',
    authorization: item.authorization,
    blocking: [],
    blockedBy: [],
    acceptance: item.acceptance,
    edge_cases: [],
  })));

  console.error(`[planning] discovered ${prd.length} PRD items`);
  console.error(`[planning] writing .gm/prd.yml`);

  try {
    fs.writeFileSync(prdPath, yaml.stringify(prd, { indent: 2 }), 'utf8');
  } catch (err) {
    console.error(`[planning] ERROR writing prd.yml:`, err.message);
    return {
      nextSkill: null,
      context,
      phase: 'ERROR',
      error: `Failed to write PRD: ${err.message}`,
    };
  }

  context.prd = prd;
  context.mutables = mutables;

  return {
    nextSkill: 'gm-execute',
    context,
    phase: 'PLAN',
  };
}

if (require.main === module) {
  const input = { request: process.argv[2] || 'default task' };
  planningSkill(input).then(result => {
    console.log(JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = planningSkill;
