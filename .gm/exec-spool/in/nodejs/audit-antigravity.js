const fs = require('fs');
const path = require('path');

const buildPath = '/c/dev/gm/build/gm-antigravity';
const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];

try {
  const skillsPath = path.join(buildPath, 'skills');
  if (!fs.existsSync(skillsPath)) {
    console.log(JSON.stringify({ error: 'build/gm-antigravity/skills not found' }, null, 2));
    process.exit(1);
  }

  const present = coreSkills.filter(skill =>
    fs.existsSync(path.join(skillsPath, skill, 'SKILL.md'))
  );

  console.log(JSON.stringify({
    antigravity_skills_present: present,
    missing_skills: coreSkills.filter(s => !present.includes(s)),
    all_present: present.length === coreSkills.length
  }, null, 2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
