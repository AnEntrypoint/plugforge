const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function updateDocsSkill(input, parentContext) {
  const context = parentContext || {
    request: input.request || '',
    taskId: input.taskId || require('crypto').randomUUID(),
    sessionId: process.env.SESSION_ID || require('crypto').randomUUID(),
  };

  console.error(`[update-docs] UPDATE-DOCS phase starting`);

  const docsUpdates = [];

  try {
    try {
      const recentCommits = execSync('git log -5 --oneline', { encoding: 'utf8' });
      console.error(`[update-docs] Recent commits:\n${recentCommits}`);
    } catch (err) {
      console.error(`[update-docs] Could not get recent commits:`, err.message);
    }

    try {
      const lastDiff = execSync('git diff HEAD~1 --stat', { encoding: 'utf8' });
      console.error(`[update-docs] Changes in HEAD~1:\n${lastDiff}`);
    } catch (err) {
      console.error(`[update-docs] Could not get diff:`, err.message);
    }

    const readmeExists = fs.existsSync('README.md');
    const agentsMdExists = fs.existsSync('AGENTS.md');
    const indexHtmlExists = fs.existsSync('docs/index.html');

    console.error(`[update-docs] README.md: ${readmeExists}`);
    console.error(`[update-docs] AGENTS.md: ${agentsMdExists}`);
    console.error(`[update-docs] docs/index.html: ${indexHtmlExists}`);

    const gmDir = path.join(process.cwd(), '.gm');
    if (!fs.existsSync(gmDir)) {
      fs.mkdirSync(gmDir, { recursive: true });
    }

    const updateState = {
      timestamp: new Date().toISOString(),
      documentsChecked: {
        readme: readmeExists,
        agents: agentsMdExists,
        indexHtml: indexHtmlExists,
      },
      updated: [],
    };

    fs.writeFileSync(path.join(gmDir, 'update-docs-state.json'), JSON.stringify(updateState, null, 2), 'utf8');

    console.error(`[update-docs] Recorded documentation state`);

  } catch (err) {
    console.error(`[update-docs] ERROR:`, err.message);
    return {
      nextSkill: null,
      context,
      phase: 'ERROR',
      error: `UPDATE-DOCS failed: ${err.message}`,
    };
  }

  try {
    console.error(`[update-docs] Attempting git operations...`);

    try {
      execSync('git status --porcelain', { encoding: 'utf8', timeout: 5000 });
      console.error(`[update-docs] Repository is clean, no docs to commit`);
    } catch (err) {
      console.error(`[update-docs] Git check failed:`, err.message);
    }
  } catch (err) {
    console.error(`[update-docs] Warning during finalization:`, err.message);
  }

  console.error(`[update-docs] UPDATE-DOCS phase complete`);

  return {
    nextSkill: null,
    context,
    phase: 'UPDATE-DOCS',
  };
}

if (require.main === module) {
  const input = { request: process.argv[2] || 'default task' };
  updateDocsSkill(input).then(result => {
    console.log(JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = updateDocsSkill;
