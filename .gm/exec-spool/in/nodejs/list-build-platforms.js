const fs = require('fs');
const path = require('path');

const buildDir = '/c/dev/gm/build';

try {
  if (!fs.existsSync(buildDir)) {
    console.log(JSON.stringify({ error: 'build dir does not exist' }, null, 2));
    process.exit(0);
  }

  const entries = fs.readdirSync(buildDir);
  const platforms = entries.filter(e => {
    const fullPath = path.join(buildDir, e);
    return fs.statSync(fullPath).isDirectory();
  });

  const platformDetails = {};
  for (const platform of platforms) {
    const platformPath = path.join(buildDir, platform);
    const skillsPath = path.join(platformPath, 'skills');
    const skillsExist = fs.existsSync(skillsPath);

    if (skillsExist) {
      const skills = fs.readdirSync(skillsPath);
      platformDetails[platform] = {
        skills_present: skills.filter(s =>
          fs.existsSync(path.join(skillsPath, s, 'SKILL.md'))
        ),
        total_skills: skills.length
      };
    } else {
      platformDetails[platform] = { skills_dir_missing: true };
    }
  }

  console.log(JSON.stringify({
    platforms_found: platforms.sort(),
    platform_count: platforms.length,
    details: platformDetails
  }, null, 2));
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
