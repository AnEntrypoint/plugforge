const fs = require('fs');
const path = require('path');

const mutsPath = path.join(process.cwd(), '.gm', 'mutables.yml');
if (fs.existsSync(mutsPath)) {
  const content = fs.readFileSync(mutsPath, 'utf8');
  console.log('=== .gm/mutables.yml ===');
  console.log(content);
} else {
  console.log('mutables.yml does not exist');
}
