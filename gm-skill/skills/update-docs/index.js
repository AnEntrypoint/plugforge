const fs = require('fs');
const path = require('path');
const git = require('../../lib/git.js');
const hooks = require('../../lib/hook-bridge.js');

async function updateDocsSkill(input, parentContext) {
  const context = parentContext || {
    request: input.request || '',
    taskId: input.taskId || require('crypto').randomUUID(),
    sessionId: process.env.SESSION_ID || require('crypto').randomUUID(),
  };

  console.error(`[update-docs] UPDATE-DOCS phase starting`);
  hooks.preToolUse();

  const docsUpdates = [];

  try {
    try {
      const logResult = await git.log(context.sessionId, 5);
      if (logResult.ok) {
        console.error(`[update-docs] Recent commits:\n${logResult.commits.join('\n')}`);
      }
    } catch (err) {
      console.error(`[update-docs] Could not get recent commits:`, err.message);
    }

    try {
      const diffResult = await git.diff(context.sessionId);
      if (diffResult.ok && diffResult.diff.length > 0) {
        console.error(`[update-docs] Changes detected (${diffResult.diff.length} bytes)`);
      }
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
      const statusResult = await git.status(context.sessionId);
      if (statusResult.ok && !statusResult.isDirty) {
        console.error(`[update-docs] Repository is clean, no docs to commit`);
      } else if (statusResult.ok && statusResult.isDirty) {
        console.error(`[update-docs] Repository has changes: ${statusResult.modified.length} modified, ${statusResult.untracked.length} untracked`);
      }
    } catch (err) {
      console.error(`[update-docs] Git check failed:`, err.message);
    }
  } catch (err) {
    console.error(`[update-docs] Warning during finalization:`, err.message);
  }

  console.error(`[update-docs] UPDATE-DOCS phase complete`);
  hooks.postToolUse();

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
