const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), '.gm', 'exec-spool', 'out');

let attempts = 0;
const maxAttempts = 60;

function checkCompletion() {
  attempts++;

  const files = [100, 101, 102];
  const completed = files.every(id => {
    const jsonFile = path.join(outDir, id + '.json');
    if (!fs.existsSync(jsonFile)) return false;
    const meta = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    return meta.exitCode === 0;
  });

  if (completed) {
    console.log('All scaffold files completed successfully');
    return true;
  }

  if (attempts >= maxAttempts) {
    console.log('Timeout waiting for scaffold completion after ' + maxAttempts + ' checks');
    process.exit(1);
  }

  console.log('Waiting for scaffold files... (attempt ' + attempts + '/' + maxAttempts + ')');
  return false;
}

if (checkCompletion()) {
  process.exit(0);
} else {
  setTimeout(() => {
    if (checkCompletion()) process.exit(0);
    else process.exit(1);
  }, 1000);
}
