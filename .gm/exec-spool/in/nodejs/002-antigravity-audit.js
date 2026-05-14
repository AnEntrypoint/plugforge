const fs = require('fs');
const path = require('path');

const antigravityBuildPath = '/c/dev/gm/build/gm-antigravity';

try {
  if (!fs.existsSync(antigravityBuildPath)) {
    console.log('antigravity build dir not found. Running clean build...');
    process.exit(0);
  }

  const skillsPath = path.join(antigravityBuildPath, 'skills');
  if (!fs.existsSync(skillsPath)) {
    console.log(JSON.stringify({ antigravity_skills_dir_missing: true }, null, 2));
    process.exit(0);
  }

  const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];
  const present = [];
  const missing = [];

  for (const skill of coreSkills) {
    const skillPath = path.join(skillsPath, skill);
    if (fs.existsSync(skillPath)) {
      const skillMd = path.join(skillPath, 'SKILL.md');
      if (fs.existsSync(skillMd)) {
        present.push(skill);
      } else {
        missing.push(`${skill} (SKILL.md missing)`);
      }
    } else {
      missing.push(skill);
    }
  }

  console.log(JSON.stringify({
    antigravity_skills_present: present,
    antigravity_skills_missing: missing,
    all_core_skills_present: missing.length === 0
  }, null, 2));
} catch (e) {
  console.error('Error auditing antigravity:', e.message);
  process.exit(1);
}
