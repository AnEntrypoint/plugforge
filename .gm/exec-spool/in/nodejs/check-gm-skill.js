const fs = require('fs');
const path = require('path');

const gmSkillPath = 'C:\\dev\\gm-skill';
try {
  const gitDir = path.join(gmSkillPath, '.git');
  const exists = fs.existsSync(gitDir);
  console.log(`gm-skill git dir exists: ${exists}`);

  if (exists) {
    const headFile = path.join(gitDir, 'HEAD');
    const head = fs.readFileSync(headFile, 'utf8').trim();
    console.log(`HEAD ref: ${head}`);
  }

  const libDir = path.join(gmSkillPath, 'lib');
  if (fs.existsSync(libDir)) {
    const files = fs.readdirSync(libDir);
    console.log(`lib/ files: ${files.join(', ')}`);
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
}
