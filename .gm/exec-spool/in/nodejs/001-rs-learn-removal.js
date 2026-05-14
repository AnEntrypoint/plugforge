const fs = require('fs');
const path = require('path');

const rsLearnPath = '/c/dev/rs-learn/src';

try {
  const files = fs.readdirSync(rsLearnPath, { recursive: true })
    .filter(f => f.endsWith('.rs'))
    .map(f => path.join(rsLearnPath, f));

  const claudeCliMatches = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('ClaudeCliClient') || content.includes('claude_cli_client')) {
      claudeCliMatches.push(file);
    }
  }

  console.log(JSON.stringify({
    total_rs_files: files.length,
    files_with_claudeclient: claudeCliMatches,
    count: claudeCliMatches.length
  }, null, 2));

  if (claudeCliMatches.length > 0) {
    console.log('\nFiles to update:');
    claudeCliMatches.forEach(f => console.log(`  ${f}`));
  }
} catch (e) {
  console.error('Error scanning rs-learn:', e.message);
  process.exit(1);
}
