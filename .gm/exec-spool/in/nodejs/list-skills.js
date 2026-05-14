const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, '../../skills');
const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

skills.forEach(s => console.log(s));
