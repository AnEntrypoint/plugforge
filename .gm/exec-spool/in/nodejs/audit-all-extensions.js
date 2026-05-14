const fs = require('fs');
const path = require('path');

const platforms = ['gm-cc', 'gm-gc', 'gm-oc', 'gm-kilo', 'gm-codex', 'gm-qwen', 'gm-copilot-cli', 'gm-hermes', 'gm-vscode', 'gm-cursor', 'gm-zed', 'gm-jetbrains'];
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
    status: present.length === coreSkills.length ? 'ok' : 'incomplete',
    present_skills: present,
    missing_count: coreSkills.length - present.length
  };
}

const allComplete = Object.values(results).filter(r => r.status === 'ok').length === platforms.length;
console.log(JSON.stringify({ extensions: results, all_complete: allComplete }, null, 2));
