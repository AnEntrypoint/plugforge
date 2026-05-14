const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), '.gm', 'exec-spool', 'out');

let attempts = 0;
const maxAttempts = 20;

function checkFiles() {
  attempts++;

  const file101 = path.join(outDir, '101.json');
  const file102 = path.join(outDir, '102.json');

  if (!fs.existsSync(file101) || !fs.existsSync(file102)) {
    console.log('Waiting for files 101/102... (attempt ' + attempts + ')');
    return false;
  }

  const meta101 = JSON.parse(fs.readFileSync(file101, 'utf8'));
  const meta102 = JSON.parse(fs.readFileSync(file102, 'utf8'));

  if (meta101.exitCode !== 0 || meta102.exitCode !== 0) {
    console.error('File 101 exit: ' + meta101.exitCode + ', File 102 exit: ' + meta102.exitCode);
    return false;
  }

  console.log('Both files completed successfully');
  return true;
}

if (checkFiles()) {
  process.exit(0);
} else if (attempts < maxAttempts) {
  console.log('Waiting for spool execution...');
  process.exit(1);
} else {
  console.error('Timeout waiting for files 101/102');
  process.exit(1);
}
