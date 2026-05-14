const fs = require('fs');
const path = require('path');

const prdPath = path.join(process.cwd(), '.gm', 'prd.yml');

try {
  if (fs.existsSync(prdPath)) {
    fs.unlinkSync(prdPath);
    console.log('✓ prd.yml deleted successfully');
  } else {
    console.log('✓ prd.yml does not exist (already clean)');
  }
} catch (err) {
  console.error('Error deleting prd.yml:', err.message);
  process.exit(1);
}

// Verify git status shows no staged/modified files
const { execSync } = require('child_process');
try {
  const status = execSync('git status --short').toString().split('\n').filter(line => {
    const first = line.charAt(0);
    return first === 'M' || first === 'A' || first === 'D';
  });

  if (status.length === 0) {
    console.log('✓ Working tree clean: no staged or modified tracked files');
  } else {
    console.log('✗ Unexpected modified files:', status.join('\n'));
    process.exit(1);
  }
} catch (err) {
  console.error('Error checking git status:', err.message);
  process.exit(1);
}
