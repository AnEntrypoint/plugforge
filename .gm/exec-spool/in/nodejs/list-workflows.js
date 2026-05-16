const fs = require('fs');
const path = require('path');

const repos = [
  'C:\\dev\\rs-exec',
  'C:\\dev\\rs-learn',
  'C:\\dev\\rs-codeinsight',
  'C:\\dev\\rs-search',
  'C:\\dev\\gm'
];

repos.forEach(repo => {
  const workflowDir = path.join(repo, '.github', 'workflows');
  if (fs.existsSync(workflowDir)) {
    console.log(`\n=== ${path.basename(repo)} ===`);
    const files = fs.readdirSync(workflowDir);
    files.forEach(f => console.log('  ' + f));
  } else {
    console.log(`\n=== ${path.basename(repo)} ===`);
    console.log('  (no workflows directory)');
  }
});
