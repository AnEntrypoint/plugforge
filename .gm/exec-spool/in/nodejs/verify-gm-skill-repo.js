const { execSync } = require('child_process');

try {
  const result = execSync('gh repo view AnEntrypoint/gm-skill --json url,nameWithOwner', {
    encoding: 'utf8'
  });
  const repo = JSON.parse(result);
  console.log('[verify] AnEntrypoint/gm-skill exists');
  console.log('[verify] URL: ' + repo.url);
  console.log('[verify] Repo: ' + repo.nameWithOwner);
  process.exit(0);
} catch (e) {
  console.error('[verify] gm-skill repo NOT found or unreachable');
  console.error('[error] ' + e.message);
  process.exit(1);
}
