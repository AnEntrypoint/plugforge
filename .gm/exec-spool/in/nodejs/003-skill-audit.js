const fs = require('fs');
const path = require('path');

const platforms = ['gm-cc', 'gm-gc', 'gm-oc', 'gm-kilo', 'gm-codex', 'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains'];
const coreSkills = ['gm', 'gm-execute', 'gm-emit', 'gm-complete'];
const buildDir = '/c/dev/gm/build';

const results = {};

for (const platform of platforms) {
  const platformPath = path.join(buildDir, platform);
  if (!fs.existsSync(platformPath)) {
    results[platform] = { status: 'not_built' };
    continue;
  }

  const skillsPath = path.join(platformPath, 'skills');
  if (!fs.existsSync(skillsPath)) {
    results[platform] = { status: 'no_skills_dir' };
    continue;
  }

  const present = coreSkills.filter(skill =>
    fs.existsSync(path.join(skillsPath, skill, 'SKILL.md'))
  );

  results[platform] = {
    status: 'ok',
    core_skills_present: present,
    missing_count: coreSkills.length - present.length
  };
}

console.log(JSON.stringify(results, null, 2));

const allMissing = Object.entries(results)
  .filter(([_, r]) => r.missing_count > 0)
  .map(([p, _]) => p);

if (allMissing.length > 0) {
  console.log(`\nPlatforms with missing core skills: ${allMissing.join(', ')}`);
}
